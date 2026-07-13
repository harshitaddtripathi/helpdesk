import { APICallError, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openai } from "@ai-sdk/openai";
import { MessageDirection, SenderType, TicketStatus } from "@prisma/client";
import {
  autoResolveTicketById,
  isAiAutoResolutionOutputFilter
} from "./ticket-auto-resolver";
import { prisma } from "./prisma";

const mocks = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: "test-openai-key"
  },
  findUniqueTicket: vi.fn(),
  updateTicket: vi.fn(),
  updateManyTicketStatus: vi.fn(),
  findAiAgent: vi.fn(),
  findManyArticles: vi.fn(),
  transaction: vi.fn(),
  updateManyTickets: vi.fn(),
  createMessage: vi.fn(),
  createAiOutput: vi.fn(),
  generateText: vi.fn(),
  openai: vi.fn((modelId: string) => ({ modelId, provider: "openai" }))
}));

vi.mock("./env", () => ({
  env: mocks.env
}));

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findUnique: mocks.findUniqueTicket,
      update: mocks.updateTicket,
      updateMany: mocks.updateManyTicketStatus
    },
    user: {
      findFirst: mocks.findAiAgent
    },
    knowledgeBaseArticle: {
      findMany: mocks.findManyArticles
    },
    $transaction: mocks.transaction
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
const findUniqueTicketMock = vi.mocked(prisma.ticket.findUnique);
const updateManyTicketStatusMock = vi.mocked(prisma.ticket.updateMany);
const findAiAgentMock = vi.mocked(prisma.user.findFirst);
const findManyArticlesMock = vi.mocked(prisma.knowledgeBaseArticle.findMany);
const transactionMock = vi.mocked(prisma.$transaction);

const ticket = {
  id: 42,
  subject: "Password reset steps",
  body: "How do I reset my password?",
  bodyHtml: null,
  senderEmail: "customer@example.com",
  senderName: "Customer One",
  status: TicketStatus.open,
  categoryId: "category-technical",
  category: {
    id: "category-technical",
    name: "Technical Question",
    slug: "technical_question"
  },
  assignedToId: null,
  providerThreadId: null,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  messages: [
    {
      id: "message-1",
      ticketId: 42,
      direction: MessageDirection.INBOUND,
      senderType: SenderType.CUSTOMER,
      fromEmail: "customer@example.com",
      toEmail: null,
      subject: "Password reset steps",
      bodyText: "How do I reset my password?",
      providerMessageId: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z")
    }
  ]
};

const article = {
  id: "article-password-reset",
  title: "Reset your password",
  body: "Use the forgot password link and follow the email instructions.",
  active: true,
  categoryId: "category-technical",
  category: {
    id: "category-technical",
    name: "Technical Question",
    slug: "technical_question"
  },
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-02T00:00:00.000Z")
};

beforeEach(() => {
  mocks.env.OPENAI_API_KEY = "test-openai-key";
  vi.clearAllMocks();
  findUniqueTicketMock.mockResolvedValue(ticket);
  updateManyTicketStatusMock.mockResolvedValue({ count: 1 } as Awaited<ReturnType<typeof prisma.ticket.updateMany>>);
  findAiAgentMock.mockResolvedValue({ id: "ai-agent-id" } as Awaited<
    ReturnType<typeof prisma.user.findFirst>
  >);
  findManyArticlesMock.mockResolvedValue([article]);
  mocks.updateManyTickets.mockResolvedValue({ count: 1 });
  mocks.createMessage.mockResolvedValue({});
  mocks.createAiOutput.mockResolvedValue({});
  transactionMock.mockImplementation(async (callback) =>
    callback({
      ticket: {
        updateMany: mocks.updateManyTickets
      },
      ticketMessage: {
        create: mocks.createMessage
      },
      aiOutput: {
        create: mocks.createAiOutput
      }
    } as never)
  );
});

describe("ticket auto resolver", () => {
  it("resolves an open ticket when a knowledge base article fully answers it", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        shouldResolve: true,
        articleId: "article-password-reset",
        reply: "Use the forgot password link and follow the email instructions.",
        reason: "The article directly answers the password reset request."
      }
    } as Awaited<ReturnType<typeof generateText>>);

    await expect(autoResolveTicketById(42)).resolves.toEqual({
      resolved: true,
      articleId: "article-password-reset",
      reply:
        "Hi Customer,\n\nUse the forgot password link and follow the email instructions.\n\nHarshita Tripathi Support"
    });

    expect(findUniqueTicketMock).toHaveBeenCalledWith({
      where: { id: 42 },
      include: {
        category: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10
        }
      }
    });
    expect(findManyArticlesMock).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [{ categoryId: "category-technical" }, { categoryId: null }]
      },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      take: 50
    });
    expect(openaiMock).toHaveBeenCalledWith("gpt-5-nano");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 700,
        maxRetries: 0,
        timeout: 20_000
      })
    );
    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request?.instructions).toContain("customer-friendly");
    expect(request?.instructions).toContain("Address the customer by their first name");
    expect(request?.instructions).toContain("sign exactly as Harshita Tripathi Support");
    expect(request?.prompt).toContain("Customer first name to use in greeting: Customer");
    expect(request?.prompt).toContain("Signature to use: Harshita Tripathi Support");
    expect(mocks.updateManyTickets).toHaveBeenCalledWith({
      where: {
        id: 42,
        status: "open"
      },
      data: {
        status: "resolved"
      }
    });
    expect(mocks.createMessage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 42,
        direction: "OUTBOUND",
        senderType: "AGENT",
        fromEmail: "ai-support@helpdesk.local",
        toEmail: "customer@example.com",
        subject: "Re: Password reset steps",
        bodyText:
          "Hi Customer,\n\nUse the forgot password link and follow the email instructions.\n\nHarshita Tripathi Support"
      })
    });
    expect(mocks.createAiOutput).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: 42,
        type: "SUGGESTED_REPLY",
        content:
          "Hi Customer,\n\nUse the forgot password link and follow the email instructions.\n\nHarshita Tripathi Support",
        metadata: expect.objectContaining({
          source: "auto-resolution",
          model: "gpt-5-nano",
          articleId: "article-password-reset",
          articleTitle: "Reset your password"
        })
      })
    });
  });

  it("leaves the ticket open when the model declines auto-resolution", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        shouldResolve: false,
        articleId: null,
        reply: null,
        reason: "The request needs account access."
      }
    } as Awaited<ReturnType<typeof generateText>>);

    await expect(autoResolveTicketById(42)).resolves.toEqual({
      resolved: false,
      reason: "The request needs account access."
    });

    expect(mocks.updateManyTickets).not.toHaveBeenCalled();
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(mocks.createAiOutput).not.toHaveBeenCalled();
    expect(updateManyTicketStatusMock).toHaveBeenCalledWith({
      where: {
        id: 42,
        assignedToId: "ai-agent-id"
      },
      data: {
        assignedToId: null
      }
    });
  });

  it("does not call OpenAI when the API key is missing", async () => {
    mocks.env.OPENAI_API_KEY = "";

    await expect(autoResolveTicketById(42)).resolves.toEqual({
      resolved: false,
      reason: "OPENAI_API_KEY is not configured."
    });

    expect(findUniqueTicketMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("exposes the ticket-list filter for AI auto-resolved tickets", () => {
    expect(isAiAutoResolutionOutputFilter()).toEqual({
      type: "SUGGESTED_REPLY",
      metadata: {
        path: ["source"],
        equals: "auto-resolution"
      }
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

    await expect(autoResolveTicketById(42)).rejects.toMatchObject({
      status: 503,
      message: "OpenAI rate limit or quota was reached. Try again later or check billing."
    });

    expect(updateManyTicketStatusMock).toHaveBeenCalledWith({
      where: {
        id: 42
      },
      data: {
        status: "open"
      }
    });
  });
});
