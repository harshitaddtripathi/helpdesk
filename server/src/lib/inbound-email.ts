import { MessageDirection, TicketStatus } from "@prisma/client";
import type { InboundEmailInput } from "core/schemas/tickets";
import { assignTicketToAiAgent } from "./ai-agent";
import { prisma } from "./prisma";
import { autoResolveTicketById } from "./ticket-auto-resolver";
import { enqueueTicketClassification } from "./ticket-classification-queue";

export type InboundEmailResult =
  | {
      status: "created";
      ticket: Awaited<ReturnType<typeof createTicketFromEmail>>;
    }
  | {
      status: "appended";
      ticket: NonNullable<Awaited<ReturnType<typeof findOpenThread>>>;
      message: Awaited<ReturnType<typeof appendInboundMessage>>;
    };

export async function receiveInboundEmail(body: InboundEmailInput): Promise<InboundEmailResult> {
  const subject = normalizeThreadSubject(body.subject);
  const existingTicket = await findOpenThread(body.from, subject);

  if (existingTicket) {
    const message = await appendInboundMessage(existingTicket.id, body);

    if (!existingTicket.categoryId) {
      queueClassification(existingTicket.id);
    }

    queueAutoResolution(existingTicket.id);

    return {
      status: "appended",
      ticket: existingTicket,
      message
    };
  }

  const ticket = await createTicketFromEmail(body, subject);

  await assignTicketToAiAgent(ticket.id);
  queueClassification(ticket.id);
  queueAutoResolution(ticket.id);

  return {
    status: "created",
    ticket
  };
}

function findOpenThread(senderEmail: string, subject: string) {
  return prisma.ticket.findFirst({
    where: {
      senderEmail,
      status: TicketStatus.open,
      subject: {
        equals: subject,
        mode: "insensitive"
      }
    },
    include: {
      category: true,
      messages: true
    }
  });
}

function appendInboundMessage(ticketId: number, body: InboundEmailInput) {
  return prisma.ticketMessage.create({
    data: {
      ticketId,
      direction: MessageDirection.INBOUND,
      fromEmail: body.from,
      subject: body.subject,
      bodyText: body.body
    }
  });
}

function createTicketFromEmail(body: InboundEmailInput, subject: string) {
  return prisma.ticket.create({
    data: {
      subject,
      body: body.body,
      bodyHtml: body.bodyHtml,
      senderEmail: body.from,
      senderName: body.fromName,
      status: TicketStatus.open,
      messages: {
        create: {
          direction: MessageDirection.INBOUND,
          fromEmail: body.from,
          subject: body.subject,
          bodyText: body.body
        }
      }
    },
    include: {
      category: true,
      messages: true
    }
  });
}

function queueClassification(ticketId: number) {
  void enqueueTicketClassification(ticketId).catch((error) => {
    console.warn(`Failed to enqueue ticket classification for ticket ${ticketId}:`, error);
  });
}

function queueAutoResolution(ticketId: number) {
  void autoResolveTicketById(ticketId).catch((error) => {
    console.warn(`Failed to auto-resolve ticket ${ticketId}:`, error);
  });
}

export function normalizeThreadSubject(subject: string) {
  const trimmedSubject = subject.trim();
  const strippedSubject = trimmedSubject.replace(/^((re|fw|fwd):\s*)+/i, "").trim();

  return strippedSubject || trimmedSubject;
}
