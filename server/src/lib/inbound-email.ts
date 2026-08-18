import { MessageDirection, TicketStatus } from "@prisma/client";
import type { InboundEmailInput } from "core/schemas/tickets";
import { assignTicketToAiAgent } from "./ai-agent";
import { prisma } from "./prisma";
import { autoResolveTicketById } from "./ticket-auto-resolver";
import { classifyTicketById } from "./ticket-classifier";

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
      await classifyAndRefreshTicket(existingTicket.id, existingTicket);
    }

    await autoResolveTicketById(existingTicket.id).catch((error) => {
      console.warn(`Failed to auto-resolve ticket ${existingTicket.id}:`, error);
    });

    const ticket = (await findTicketWithCategory(existingTicket.id)) ?? existingTicket;

    return {
      status: "appended",
      ticket,
      message
    };
  }

  const ticket = await createTicketFromEmail(body, subject);

  await assignTicketToAiAgent(ticket.id);
  await classifyAndRefreshTicket(ticket.id, ticket);

  await autoResolveTicketById(ticket.id).catch((error) => {
    console.warn(`Failed to auto-resolve ticket ${ticket.id}:`, error);
  });

  const refreshedTicket = (await findTicketWithCategory(ticket.id)) ?? ticket;

  return {
    status: "created",
    ticket: refreshedTicket
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

async function classifyAndRefreshTicket<TFallback>(ticketId: number, fallback: TFallback) {
  try {
    await classifyTicketById(ticketId);
  } catch (error) {
    console.warn(`Failed to classify ticket ${ticketId}:`, error);
    return fallback;
  }

  const ticket = await findTicketWithCategory(ticketId);

  return ticket ?? fallback;
}

function findTicketWithCategory(ticketId: number) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      messages: true
    }
  });
}

export function normalizeThreadSubject(subject: string) {
  const trimmedSubject = subject.trim();
  const strippedSubject = trimmedSubject.replace(/^((re|fw|fwd):\s*)+/i, "").trim();

  return strippedSubject || trimmedSubject;
}
