import { Router } from "express";
import { TicketStatus } from "@prisma/client";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [open, resolved, closed, recentTickets, categoryCounts, categories] =
      await Promise.all([
        prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
        prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
        prisma.ticket.findMany({
          take: 5,
          orderBy: { updatedAt: "desc" },
          include: { category: true }
        }),
        prisma.ticket.groupBy({
          by: ["categoryId"],
          _count: { _all: true }
        }),
        prisma.category.findMany()
      ]);

    const countsByCategory = categoryCounts.map((count) => {
      const category = categories.find((item) => item.id === count.categoryId);
      return {
        categoryId: count.categoryId,
        name: category?.name ?? "Uncategorized",
        slug: category?.slug ?? "uncategorized",
        count: count._count._all
      };
    });

    res.json({
      stats: {
        open,
        resolved,
        closed,
        total: open + resolved + closed
      },
      countsByCategory,
      recentTickets
    });
  })
);
