import { Router } from "express";
import { inboundEmailSchema } from "core/schemas/tickets";
import { MessageDirection, TicketStatus } from "@prisma/client";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/inbound-email",
  requireWebhookSecret,
  asyncHandler(async (req, res) => {
    const body = inboundEmailSchema.parse(req.body);
    const subject = normalizeThreadSubject(body.subject);

    const existingTicket = await prisma.ticket.findFirst({
      where: {
        senderEmail: body.from,
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

    if (existingTicket) {
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: existingTicket.id,
          direction: MessageDirection.INBOUND,
          fromEmail: body.from,
          subject: body.subject,
          bodyText: body.body
        }
      });

      res.status(200).json({ ticket: existingTicket, message });
      return;
    }

    const ticket = await prisma.ticket.create({
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

    res.status(201).json({ ticket });
  })
);

function normalizeThreadSubject(subject: string) {
  const trimmedSubject = subject.trim();
  const strippedSubject = trimmedSubject.replace(/^((re|fw|fwd):\s*)+/i, "").trim();

  return strippedSubject || trimmedSubject;
}
