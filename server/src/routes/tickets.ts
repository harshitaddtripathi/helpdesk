import { Router } from "express";
import { MessageDirection, Prisma, TicketStatus, UserRole } from "@prisma/client";
import {
  ticketListQuerySchema,
  type TicketListQuery,
  type TicketSortField
} from "core/schemas/tickets";
import { ticketStatuses } from "core/constants/ticket-status";
import { z } from "zod";
import { asyncHandler, HttpError, requireStringParam, validate } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const statusSchema = z
  .enum(ticketStatuses)
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
  categorySlug: z.string().optional(),
  assignedToId: z.string().optional()
});

const replySchema = z.object({
  bodyText: z.string().min(1)
});

ticketsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = validate(ticketListQuerySchema, req.query);
    const tickets = await prisma.ticket.findMany({
      where: getTicketWhere(query),
      orderBy: getTicketOrderBy(query.sortBy, query.sortOrder),
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
    const [ticket, agents] = await prisma.$transaction([
      prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              active: true
            }
          },
          messages: { orderBy: { createdAt: "asc" } },
          aiOutputs: { orderBy: { createdAt: "desc" } }
        }
      }),
      prisma.user.findMany({
        where: {
          role: UserRole.agent,
          active: true,
          deletedAt: null
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true
        }
      })
    ]);

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.");
    }

    res.json({ ticket, agents });
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

    if (body.assignedToId !== undefined) {
      const assignedToId = body.assignedToId.trim();

      if (!assignedToId) {
        data.assignedTo = { disconnect: true };
      } else {
        const agent = await prisma.user.findFirst({
          where: {
            id: assignedToId,
            role: UserRole.agent,
            active: true,
            deletedAt: null
          },
          select: { id: true }
        });

        if (!agent) {
          throw new HttpError(400, "Unknown active agent.");
        }

        data.assignedTo = { connect: { id: agent.id } };
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: {
        category: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true
          }
        }
      }
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

function getTicketWhere(query: TicketListQuery) {
  const filters: Prisma.TicketWhereInput[] = [];

  if (query.search) {
    filters.push({
      OR: [
        { subject: { contains: query.search, mode: "insensitive" } },
        { senderName: { contains: query.search, mode: "insensitive" } },
        { senderEmail: { contains: query.search, mode: "insensitive" } }
      ]
    });
  }

  if (query.status !== "all") {
    filters.push({ status: query.status as TicketStatus });
  }

  if (query.category === "uncategorized") {
    filters.push({ categoryId: null });
  } else if (query.category !== "all") {
    filters.push({ category: { slug: query.category } });
  }

  if (filters.length === 0) {
    return undefined;
  }

  return { AND: filters } satisfies Prisma.TicketWhereInput;
}

function getTicketOrderBy(sortBy: TicketSortField, sortOrder: "asc" | "desc") {
  if (sortBy === "category") {
    return { category: { name: sortOrder } } satisfies Prisma.TicketOrderByWithRelationInput;
  }

  return { [sortBy]: sortOrder } satisfies Prisma.TicketOrderByWithRelationInput;
}

function requireNumberParam(value: string | string[] | undefined, name: string) {
  const stringValue = requireStringParam(value, name);
  const parsedValue = Number(stringValue);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  throw new HttpError(400, `Missing or invalid route parameter: ${name}.`);
}
