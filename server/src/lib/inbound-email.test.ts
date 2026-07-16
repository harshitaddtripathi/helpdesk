import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageDirection, TicketStatus } from "@prisma/client";
import { receiveInboundEmail } from "./inbound-email";

const mocks = vi.hoisted(() => ({
  ticketFindFirst: vi.fn(),
  ticketCreate: vi.fn(),
  ticketMessageCreate: vi.fn(),
  assignTicketToAiAgent: vi.fn(),
  autoResolveTicketById: vi.fn(),
  enqueueTicketClassification: vi.fn()
}));

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
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

vi.mock("./ticket-classification-queue", () => ({
  enqueueTicketClassification: mocks.enqueueTicketClassification
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
  mocks.enqueueTicketClassification.mockResolvedValue("job-1");
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

    await expect(receiveInboundEmail(email)).resolves.toEqual({
      status: "created",
      ticket
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
    expect(mocks.enqueueTicketClassification).toHaveBeenCalledWith(42);
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

    await expect(receiveInboundEmail(email)).resolves.toEqual({
      status: "appended",
      ticket,
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
    expect(mocks.enqueueTicketClassification).toHaveBeenCalledWith(7);
    expect(mocks.autoResolveTicketById).toHaveBeenCalledWith(7);
  });
});
