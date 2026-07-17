import { APICallError, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { google } from "@ai-sdk/google";
import { HttpError } from "./http";
import {
  classifyTicket,
  ensureTicketClassifierConfigured,
  getTicketClassificationContext,
  type TicketClassificationContext
} from "./ticket-classifier";
import { prisma } from "./prisma";

const mocks = vi.hoisted(() => ({
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: "test-gemini-key",
    GOOGLE_GENERATIVE_AI_MODEL: "gemini-3.5-flash"
  },
  findUnique: vi.fn(),
  findManyCategories: vi.fn(),
  createAiOutput: vi.fn(),
  updateManyTickets: vi.fn(),
  generateText: vi.fn(),
  google: vi.fn((modelId: string) => ({ modelId, provider: "google" }))
}));

vi.mock("./env", () => ({
  env: mocks.env
}));

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateManyTickets
    },
    category: {
      findMany: mocks.findManyCategories
    },
    aiOutput: {
      create: mocks.createAiOutput
    }
  }
}));

vi.mock("@ai-sdk/google", () => ({
  google: mocks.google
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  return {
    ...actual,
    generateText: mocks.generateText
  };
});

const generateTextMock = vi.mocked(generateText);
const googleMock = vi.mocked(google);
const findUniqueMock = vi.mocked(prisma.ticket.findUnique);
const findManyCategoriesMock = vi.mocked(prisma.category.findMany);
const createAiOutputMock = vi.mocked(prisma.aiOutput.create);
const updateManyTicketsMock = vi.mocked(prisma.ticket.updateMany);

const categories = [
  {
    id: "category-general",
    name: "General Question",
    slug: "general_question",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z")
  },
  {
    id: "category-refund",
    name: "Refund Request",
    slug: "refund_request",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z")
  },
  {
    id: "category-technical",
    name: "Technical Question",
    slug: "technical_question",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z")
  }
];

const ticket = {
  id: 102,
  subject: "Refund for a course",
  body: "How can I get a refund for a course?",
  senderEmail: "riya@example.com",
  senderName: "Riya Sharma",
  category: null,
  messages: [
    {
      id: "message-1",
      senderType: "CUSTOMER",
      bodyText: "How can I get a refund for a course?"
    }
  ]
} as TicketClassificationContext;

beforeEach(() => {
  mocks.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-gemini-key";
  vi.clearAllMocks();
  findManyCategoriesMock.mockResolvedValue(categories);
  createAiOutputMock.mockResolvedValue({
    id: "classification-1",
    ticketId: ticket.id,
    type: "CLASSIFICATION",
    content: "refund_request",
    metadata: {},
    createdAt: new Date("2026-07-01T00:00:00.000Z")
  });
  updateManyTicketsMock.mockResolvedValue({ count: 1 });
});

describe("ticket classifier", () => {
  it("classifies an uncategorized ticket and applies the matching category", async () => {
    generateTextMock.mockResolvedValueOnce({ output: "refund_request" } as Awaited<ReturnType<typeof generateText>>);

    await expect(classifyTicket(ticket)).resolves.toEqual({
      categorySlug: "refund_request",
      applied: true
    });

    expect(googleMock).toHaveBeenCalledWith("gemini-3.5-flash");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 50,
        maxRetries: 0,
        timeout: 20_000
      })
    );

    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request?.instructions).toContain("Classify a helpdesk ticket");
    expect(request?.instructions).toContain("Choose refund_request");
    expect(request?.prompt).toContain("refund_request: Refund Request");
    expect(request?.prompt).toContain("Subject: Refund for a course");
    expect(request?.prompt).toContain("Customer: How can I get a refund for a course?");
    expect(createAiOutputMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 102,
        type: "CLASSIFICATION",
        content: "refund_request",
        metadata: expect.objectContaining({
          model: "gemini-3.5-flash",
          applied: true
        })
      })
    });
    expect(updateManyTicketsMock).toHaveBeenCalledWith({
      where: {
        id: 102,
        categoryId: null
      },
      data: {
        categoryId: "category-refund"
      }
    });
  });

  it("records gibberish as uncategorized without applying a category", async () => {
    generateTextMock.mockResolvedValueOnce({ output: "uncategorized" } as Awaited<ReturnType<typeof generateText>>);

    await expect(classifyTicket({ ...ticket, subject: "asdf qwer", body: "zzzz qqqq" })).resolves.toEqual({
      categorySlug: null,
      applied: false
    });

    expect(createAiOutputMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 102,
        type: "CLASSIFICATION",
        content: "uncategorized",
        metadata: expect.objectContaining({
          applied: false
        })
      })
    });
    expect(updateManyTicketsMock).not.toHaveBeenCalled();
  });

  it("does not reclassify a ticket that already has a category", async () => {
    const categorizedTicket = {
      ...ticket,
      category: {
        id: "category-technical",
        name: "Technical Question",
        slug: "technical_question"
      }
    } as TicketClassificationContext;

    await expect(classifyTicket(categorizedTicket)).resolves.toEqual({
      categorySlug: "technical_question",
      applied: false
    });

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(updateManyTicketsMock).not.toHaveBeenCalled();
  });

  it("throws a configuration error when the Google Gemini API key is missing", () => {
    mocks.env.GOOGLE_GENERATIVE_AI_API_KEY = "";

    expect(() => ensureTicketClassifierConfigured()).toThrow(
      new HttpError(501, "GOOGLE_GENERATIVE_AI_API_KEY is not configured.")
    );
  });

  it("loads ticket classification context with recent inbound history", async () => {
    findUniqueMock.mockResolvedValueOnce(ticket);

    await expect(getTicketClassificationContext(42)).resolves.toBe(ticket);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
      include: {
        category: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 8
        }
      }
    });
  });

  it("maps Google Gemini quota errors to a service-unavailable response", async () => {
    generateTextMock.mockRejectedValueOnce(
      new APICallError({
        message: "quota exceeded",
        url: "https://generativelanguage.googleapis.com/v1beta/models",
        requestBodyValues: {},
        statusCode: 429,
        isRetryable: false
      })
    );

    await expect(classifyTicket(ticket)).rejects.toMatchObject({
      status: 503,
      message: "Google Gemini rate limit or quota was reached. Try again later or check billing."
    });
  });
});
