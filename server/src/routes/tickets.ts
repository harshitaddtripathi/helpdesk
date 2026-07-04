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
  .transform((value) => value.toUpperCase() as TicketStatus);

const createTicketSchema = z.object({
  subject: z.string().min(1),
  senderEmail: z.string().email(),
  senderName: z.string().optional(),
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
  asyncHandler(async (req, res) => {
    const where: Prisma.TicketWhereInput = {};
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const search = typeof req.query.search === "string" ? req.query.search : "";

    const parsedStatus = status ? statusSchema.safeParse(status) : null;
    if (parsedStatus?.success) {
      where.status = parsedStatus.data;
    }

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { senderEmail: { contains: search, mode: "insensitive" } },
        { messages: { some: { bodyText: { contains: search, mode: "insensitive" } } } }
      ];
    }

    const sortField = req.query.sort === "updatedAt" ? "updatedAt" : "createdAt";
    const sortDirection = req.query.direction === "asc" ? "asc" : "desc";

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: {
        [sortField]: sortDirection
      },
      include: {
        category: true,
        _count: { select: { messages: true } }
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
    const ticketId = requireStringParam(req.params.id, "id");
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
    const ticketId = requireStringParam(req.params.id, "id");
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
    const ticketId = requireStringParam(req.params.id, "id");
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
