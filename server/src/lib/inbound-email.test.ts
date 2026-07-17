import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageDirection, TicketStatus } from "@prisma/client";
import { receiveInboundEmail } from "./inbound-email";

const mocks = vi.hoisted(() => ({
  ticketFindFirst: vi.fn(),
  ticketFindUnique: vi.fn(),
  ticketCreate: vi.fn(),
  ticketMessageCreate: vi.fn(),
  assignTicketToAiAgent: vi.fn(),
  autoResolveTicketById: vi.fn(),
  classifyTicketById: vi.fn()
}));

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
      findUnique: mocks.ticketFindUnique,
      create: mocks.ticketCreate
    },
    ticketMessage: {
      create: mocks.ticketMessageCreate
    }
  }
}));

vi.mock("./ai-agent", () => ({
  assignTicketToAiAgent: mocks.assignTicketToAiAgent
}));

vi.mock("./ticket-auto-resolver", () => ({
  autoResolveTicketById: mocks.autoResolveTicketById
}));

vi.mock("./ticket-classifier", () => ({
  classifyTicketById: mocks.classifyTicketById
}));

const email = {
  from: "customer@example.com",
  fromName: "Customer Example",
  subject: "Re: Refund request",
  body: "I need help with my refund."
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assignTicketToAiAgent.mockResolvedValue(true);
  mocks.autoResolveTicketById.mockResolvedValue({ resolved: false, reason: "No article." });
  mocks.classifyTicketById.mockResolvedValue(undefined);
});

describe("receiveInboundEmail", () => {
  it("creates a new ticket and queues automated processing", async () => {
    const ticket = {
      id: 42,
      subject: "Refund request",
      category: null,
      categoryId: null,
      messages: []
    };

    mocks.ticketFindFirst.mockResolvedValue(null);
    mocks.ticketCreate.mockResolvedValue(ticket);
    mocks.ticketFindUnique.mockResolvedValue({
      ...ticket,
      categoryId: "category-refund",
      category: {
        id: "category-refund",
        name: "Refund Request",
        slug: "refund_request"
      }
    });

    await expect(receiveInboundEmail(email)).resolves.toEqual({
      status: "created",
      ticket: {
        ...ticket,
        categoryId: "category-refund",
        category: {
          id: "category-refund",
          name: "Refund Request",
          slug: "refund_request"
        }
      }
    });

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senderEmail: email.from,
          status: TicketStatus.open,
          subject: {
            equals: "Refund request",
            mode: "insensitive"
          }
        })
      })
    );
    expect(mocks.ticketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: "Refund request",
          body: email.body,
          senderEmail: email.from,
          senderName: email.fromName,
          status: TicketStatus.open
        })
      })
    );
    expect(mocks.assignTicketToAiAgent).toHaveBeenCalledWith(42);
    expect(mocks.classifyTicketById).toHaveBeenCalledWith(42);
    expect(mocks.ticketFindUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      include: {
        category: true,
        messages: true
      }
    });
    expect(mocks.autoResolveTicketById).toHaveBeenCalledWith(42);
  });

  it("appends to an existing open thread and does not create another ticket", async () => {
    const ticket = {
      id: 7,
      subject: "Refund request",
      categoryId: null,
      category: null,
      messages: []
    };
    const message = {
      id: "message-1",
      ticketId: 7,
      direction: MessageDirection.INBOUND,
      bodyText: email.body
    };

    mocks.ticketFindFirst.mockResolvedValue(ticket);
    mocks.ticketMessageCreate.mockResolvedValue(message);
    mocks.ticketFindUnique.mockResolvedValue({
      ...ticket,
      categoryId: "category-refund",
      category: {
        id: "category-refund",
        name: "Refund Request",
        slug: "refund_request"
      }
    });

    await expect(receiveInboundEmail(email)).resolves.toEqual({
      status: "appended",
      ticket: {
        ...ticket,
        categoryId: "category-refund",
        category: {
          id: "category-refund",
          name: "Refund Request",
          slug: "refund_request"
        }
      },
      message
    });

    expect(mocks.ticketMessageCreate).toHaveBeenCalledWith({
      data: {
        ticketId: 7,
        direction: MessageDirection.INBOUND,
        fromEmail: email.from,
        subject: email.subject,
        bodyText: email.body
      }
    });
    expect(mocks.ticketCreate).not.toHaveBeenCalled();
    expect(mocks.assignTicketToAiAgent).not.toHaveBeenCalled();
    expect(mocks.classifyTicketById).toHaveBeenCalledWith(7);
    expect(mocks.autoResolveTicketById).toHaveBeenCalledWith(7);
  });
});
