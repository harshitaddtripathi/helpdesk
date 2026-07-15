import { APICallError, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openai } from "@ai-sdk/openai";
import { HttpError } from "./http";
import {
  ensureTicketSummarizerConfigured,
  getTicketSummaryContext,
  summarizeTicket,
  type TicketSummaryContext
} from "./ticket-summarizer";
import { env } from "./env";
import { prisma } from "./prisma";

const mocks = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: "test-openai-key"
  },
  findUnique: vi.fn(),
  generateText: vi.fn(),
  openai: vi.fn((modelId: string) => ({ modelId, provider: "openai" }))
}));

vi.mock("./env", () => ({
  env: mocks.env
}));

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findUnique: mocks.findUnique
    }
  }
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: mocks.openai
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  return {
    ...actual,
    generateText: mocks.generateText
  };
});

const generateTextMock = vi.mocked(generateText);
const openaiMock = vi.mocked(openai);
const findUniqueMock = vi.mocked(prisma.ticket.findUnique);

const ticket = {
  id: 1,
  subject: "Refund request",
  body: "I need a refund.",
  senderEmail: "mina@example.com",
  senderName: "Mina Patel",
  status: "open",
  category: {
    id: "category-refund",
    name: "Refund Request",
    slug: "refund_request"
  },
  assignedTo: {
    name: "Alex Morgan",
    email: "alex.agent@example.com"
  },
  messages: [
    {
      id: "message-1",
      senderType: "CUSTOMER",
      bodyText: "Can you help me with a refund?",
      createdAt: new Date("2026-07-01T12:00:00.000Z")
    },
    {
      id: "message-2",
      senderType: "AGENT",
      bodyText: "We are checking your order.",
      createdAt: new Date("2026-07-01T12:05:00.000Z")
    }
  ]
} as TicketSummaryContext;

beforeEach(() => {
  mocks.env.OPENAI_API_KEY = "test-openai-key";
  vi.clearAllMocks();
});

describe("ticket summarizer", () => {
  it("builds a summary request from ticket details and conversation history", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "  - Customer needs a refund.\n- Agent is checking the order.  " } as Awaited<
      ReturnType<typeof generateText>
    >);

    await expect(summarizeTicket(ticket)).resolves.toBe(
      "- Customer needs a refund.\n- Agent is checking the order."
    );

    expect(openaiMock).toHaveBeenCalledWith("gpt-5-nano");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 700,
        maxRetries: 0,
        timeout: 20_000
      })
    );

    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request?.instructions).toContain("Summarize a helpdesk ticket");
    expect(request?.instructions).toContain("Do not invent facts");
    expect(request?.prompt).toContain("Subject: Refund request");
    expect(request?.prompt).toContain("Customer: Mina Patel <mina@example.com>");
    expect(request?.prompt).toContain("Assigned agent: Alex Morgan <alex.agent@example.com>");
    expect(request?.prompt).toContain("Customer at 2026-07-01T12:00:00.000Z: Can you help me with a refund?");
    expect(request?.prompt).toContain("Agent at 2026-07-01T12:05:00.000Z: We are checking your order.");
  });

  it("throws a configuration error when the OpenAI API key is missing", () => {
    mocks.env.OPENAI_API_KEY = "";

    expect(() => ensureTicketSummarizerConfigured()).toThrow(
      new HttpError(501, "OPENAI_API_KEY is not configured.")
    );
  });

  it("loads ticket summary context with full conversation history", async () => {
    findUniqueMock.mockResolvedValueOnce(ticket);

    await expect(getTicketSummaryContext(42)).resolves.toBe(ticket);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
      include: {
        category: true,
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  });

  it("turns an empty AI response into a gateway error", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "   " } as Awaited<ReturnType<typeof generateText>>);

    await expect(summarizeTicket(ticket)).rejects.toMatchObject({
      status: 502,
      message: "AI did not return a ticket summary."
    });
  });

  it("maps OpenAI quota errors to a service-unavailable response", async () => {
    generateTextMock.mockRejectedValueOnce(
      new APICallError({
        message: "quota exceeded",
        url: "https://api.openai.com/v1/responses",
        requestBodyValues: {},
        statusCode: 429,
        isRetryable: false
      })
    );

    await expect(summarizeTicket(ticket)).rejects.toMatchObject({
      status: 503,
      message: "OpenAI rate limit or quota was reached. Try again later or check billing."
    });
  });
});
