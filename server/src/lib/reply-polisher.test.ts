import { APICallError, RetryError, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openai } from "@ai-sdk/openai";
import { HttpError } from "./http";
import {
  ensureReplyPolisherConfigured,
  getTicketPolishContext,
  polishReply,
  type TicketPolishContext
} from "./reply-polisher";
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
  messages: [
    {
      id: "message-2",
      senderType: "AGENT",
      bodyText: "We are checking your order."
    },
    {
      id: "message-1",
      senderType: "CUSTOMER",
      bodyText: "Can you help me with a refund?"
    }
  ]
} as TicketPolishContext;

beforeEach(() => {
  mocks.env.OPENAI_API_KEY = "test-openai-key";
  vi.clearAllMocks();
});

describe("reply polisher", () => {
  it("builds a polishing request with customer first name and support signature instructions", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "  We can help with this and will keep the next steps clear.  " } as Awaited<
      ReturnType<typeof generateText>
    >);

    await expect(polishReply(ticket, "refund ok", "Harshita Tripathi Support")).resolves.toBe(
      "Hi Mina,\n\nWe can help with this and will keep the next steps clear.\n\nHarshita Tripathi Support"
    );

    expect(openaiMock).toHaveBeenCalledWith("gpt-5-nano");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 600,
        maxRetries: 0,
        timeout: 20_000
      })
    );

    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request?.instructions).toContain("Address the customer by their first name");
    expect(request?.instructions).toContain("sign the reply exactly as Harshita Tripathi Support");
    expect(request?.prompt).toContain("Customer first name to use in greeting: Mina");
    expect(request?.prompt).toContain("Agent name for context only: Harshita Tripathi Support");
    expect(request?.prompt).toContain("Signature to use: Harshita Tripathi Support");
    expect(request?.prompt).toContain("Customer: Can you help me with a refund?");
    expect(request?.prompt).toContain("Agent: We are checking your order.");
    expect(request?.prompt).toContain("Agent draft:\nrefund ok");
  });

  it("uses a generic customer greeting name when the requester name is blank", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "We can help." } as Awaited<
      ReturnType<typeof generateText>
    >);

    await expect(polishReply({ ...ticket, senderName: "   " }, "please help", "Harshita Tripathi Support")).resolves.toBe(
      "Hi there,\n\nWe can help.\n\nHarshita Tripathi Support"
    );

    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request?.prompt).toContain("Customer first name to use in greeting: there");
  });

  it("throws a configuration error when the OpenAI API key is missing", () => {
    mocks.env.OPENAI_API_KEY = "";

    expect(() => ensureReplyPolisherConfigured()).toThrow(
      new HttpError(501, "OPENAI_API_KEY is not configured.")
    );
  });

  it("loads ticket polish context with the recent messages needed for the prompt", async () => {
    findUniqueMock.mockResolvedValueOnce(ticket);

    await expect(getTicketPolishContext(42)).resolves.toBe(ticket);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
      include: {
        category: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 12
        }
      }
    });
  });

  it("turns an empty AI response into a gateway error", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "   " } as Awaited<ReturnType<typeof generateText>>);

    await expect(polishReply(ticket, "refund ok", "Harshita Tripathi Support")).rejects.toMatchObject({
      status: 502,
      message: "AI did not return a polished reply."
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

    await expect(polishReply(ticket, "refund ok", "Harshita Tripathi Support")).rejects.toMatchObject({
      status: 503,
      message: "OpenAI rate limit or quota was reached. Try again later or check billing."
    });
  });

  it("unwraps retry errors and maps the final OpenAI error", async () => {
    const apiError = new APICallError({
      message: "model missing",
      url: "https://api.openai.com/v1/responses",
      requestBodyValues: {},
      statusCode: 404,
      isRetryable: false
    });

    generateTextMock.mockRejectedValueOnce(
      new RetryError({
        message: "Failed after 3 attempts.",
        reason: "maxRetriesExceeded",
        errors: [apiError]
      })
    );

    await expect(polishReply(ticket, "refund ok", "Harshita Tripathi Support")).rejects.toMatchObject({
      status: 502,
      message: "OpenAI could not find gpt-5-nano for this API key."
    });
  });
});
