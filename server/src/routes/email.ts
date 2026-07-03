import { Router } from "express";
import { MessageDirection } from "@prisma/client";
import { z } from "zod";
import { env } from "../lib/env";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

export const emailRouter = Router();

const inboundEmailSchema = z.object({
  from: z.string().email(),
  fromName: z.string().optional(),
  to: z.string().email().optional(),
  subject: z.string().min(1),
  text: z.string().min(1),
  messageId: z.string().optional(),
  threadId: z.string().optional()
});

emailRouter.post(
  "/inbound",
  asyncHandler(async (req, res) => {
    verifyWebhookSecret(req.headers["x-webhook-secret"]);

    const body = inboundEmailSchema.parse(req.body);
    const defaultCategory = await prisma.category.findUnique({
      where: { slug: "general-questions" }
    });

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

      res.status(201).json({ ticketId: existingTicket.id, message });
      return;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        senderEmail: body.from,
        senderName: body.fromName,
        providerThreadId: body.threadId,
        categoryId: defaultCategory?.id,
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

    res.status(201).json({ ticket });
  })
);

function verifyWebhookSecret(headerValue: string | string[] | undefined) {
  if (!env.EMAIL_WEBHOOK_SECRET) return;

  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (value !== env.EMAIL_WEBHOOK_SECRET) {
    throw new HttpError(401, "Invalid email webhook secret.");
  }
}

