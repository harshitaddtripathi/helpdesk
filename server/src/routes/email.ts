import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { MessageDirection } from "@prisma/client";
import { inboundEmailSchema as simulatorEmailSchema } from "core/schemas/tickets";
import { z } from "zod";
import { env } from "../lib/env";
import { asyncHandler, HttpError } from "../lib/http";
import { receiveInboundEmail } from "../lib/inbound-email";
import { prisma } from "../lib/prisma";
import { assignTicketToAiAgent } from "../lib/ai-agent";
import { autoResolveTicketById } from "../lib/ticket-auto-resolver";
import { requireAdmin } from "../middleware/require-auth";

export const emailRouter = Router();

const inboundEmailSchema = z.object({
  from: z.string().email(),
  fromName: z.string().min(1),
  to: z.string().email().optional(),
  subject: z.string().min(1),
  text: z.string().min(1),
  messageId: z.string().optional(),
  threadId: z.string().optional()
});

emailRouter.post(
  "/simulate",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = simulatorEmailSchema.parse(req.body);
    const result = await receiveInboundEmail(body);
    const statusCode = result.status === "created" ? 201 : 200;

    res.status(statusCode).json({
      simulated: true,
      status: result.status,
      ticket: result.ticket,
      ...(result.status === "appended" ? { message: result.message } : {})
    });
  })
);

emailRouter.post(
  "/inbound",
  asyncHandler(async (req, res) => {
    verifyWebhookSecret(req.headers["x-webhook-secret"]);

    const body = inboundEmailSchema.parse(req.body);
    const existingTicket = body.threadId
      ? await prisma.ticket.findFirst({
          where: { providerThreadId: body.threadId }
        })
      : null;

    if (existingTicket) {
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: existingTicket.id,
          direction: MessageDirection.INBOUND,
          fromEmail: body.from,
          toEmail: body.to,
          subject: body.subject,
          bodyText: body.text,
          providerMessageId: body.messageId
        }
      });

      void autoResolveTicketById(existingTicket.id).catch((error) => {
        console.warn(`Failed to auto-resolve ticket ${existingTicket.id}:`, error);
      });

      res.status(201).json({ ticketId: existingTicket.id, message });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        body: body.text,
        senderEmail: body.from,
        senderName: body.fromName,
        providerThreadId: body.threadId,
        messages: {
          create: {
            direction: MessageDirection.INBOUND,
            fromEmail: body.from,
            toEmail: body.to,
            subject: body.subject,
            bodyText: body.text,
            providerMessageId: body.messageId
          }
        }
      },
      include: { messages: true, category: true }
    });

    await assignTicketToAiAgent(ticket.id);

    void autoResolveTicketById(ticket.id).catch((error) => {
      console.warn(`Failed to auto-resolve ticket ${ticket.id}:`, error);
    });

    res.status(201).json({ ticket });
  })
);

function verifyWebhookSecret(headerValue: string | string[] | undefined) {
  if (!env.EMAIL_WEBHOOK_SECRET) {
    throw new HttpError(503, "Email webhook is not configured.");
  }

  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!value || !constantTimeEquals(value, env.EMAIL_WEBHOOK_SECRET)) {
    throw new HttpError(401, "Invalid email webhook secret.");
  }
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
