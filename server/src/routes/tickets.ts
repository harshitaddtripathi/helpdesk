import { Router } from "express";
import { MessageDirection, Prisma, TicketStatus } from "@prisma/client";
import { z } from "zod";
import { asyncHandler, HttpError, requireStringParam } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const statusSchema = z
  .enum(["open", "resolved", "closed"])
  .transform((value) => value as TicketStatus);

const createTicketSchema = z.object({
  subject: z.string().min(1),
  senderEmail: z.string().email(),
  senderName: z.string().min(1),
  categorySlug: z.string().optional(),
  bodyText: z.string().min(1)
});

const updateTicketSchema = z.object({
  status: statusSchema.optional(),
  categorySlug: z.string().optional()
});

const replySchema = z.object({
  bodyText: z.string().min(1)
});

ticketsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tickets = await prisma.ticket.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        status: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ tickets });
  })
);

ticketsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createTicketSchema.parse(req.body);
    const category = body.categorySlug
      ? await prisma.category.findUnique({ where: { slug: body.categorySlug } })
      : null;

    if (body.categorySlug && !category) {
      throw new HttpError(400, "Unknown category.");
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        body: body.bodyText,
        senderEmail: body.senderEmail,
        senderName: body.senderName,
        categoryId: category?.id,
        messages: {
          create: {
            direction: MessageDirection.INBOUND,
            fromEmail: body.senderEmail,
            subject: body.subject,
            bodyText: body.bodyText
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

ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticketId = requireNumberParam(req.params.id, "id");
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        messages: { orderBy: { createdAt: "asc" } },
        aiOutputs: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.");
    }

    res.json({ ticket });
  })
);

ticketsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticketId = requireNumberParam(req.params.id, "id");
    const body = updateTicketSchema.parse(req.body);
    const data: Prisma.TicketUpdateInput = {};

    if (body.status) {
      data.status = body.status;
    }

    if (body.categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: body.categorySlug }
      });

      if (!category) {
        throw new HttpError(400, "Unknown category.");
      }

      data.category = { connect: { id: category.id } };
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: { category: true }
    });

    res.json({ ticket });
  })
);

ticketsRouter.post(
  "/:id/replies",
  asyncHandler(async (req, res) => {
    const ticketId = requireNumberParam(req.params.id, "id");
    const body = replySchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.");
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        direction: MessageDirection.OUTBOUND,
        fromEmail: req.user?.email ?? "agent",
        toEmail: ticket.senderEmail,
        subject: `Re: ${ticket.subject}`,
        bodyText: body.bodyText
      }
    });

    res.status(201).json({ message });
  })
);

function requireNumberParam(value: string | string[] | undefined, name: string) {
  const stringValue = requireStringParam(value, name);
  const parsedValue = Number(stringValue);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  throw new HttpError(400, `Missing or invalid route parameter: ${name}.`);
}
