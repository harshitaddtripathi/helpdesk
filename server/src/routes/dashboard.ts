import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

type DashboardStatsRow = {
  total: number | bigint;
  open_tickets: number | bigint;
  resolved_tickets: number | bigint;
  closed_tickets: number | bigint;
  ai_resolved: number | bigint;
  ai_resolved_percent: number | string;
  average_resolution_time_seconds: number | bigint | null;
  tickets_by_day: unknown;
  counts_by_category: unknown;
};

type TicketsByDayItem = {
  date: string;
  label: string;
  count: number;
};

type CountByCategoryItem = {
  categoryId: string | null;
  name: string;
  slug: string;
  count: number;
};

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [statsRows, recentTickets] = await Promise.all([
      prisma.$queryRaw<DashboardStatsRow[]>`SELECT * FROM get_dashboard_stats()`,
      prisma.ticket.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { category: true }
      })
    ]);
    const statsRow = statsRows[0];

    if (!statsRow) {
      throw new Error("Dashboard stats function returned no rows.");
    }

    res.json({
      stats: {
        open: toNumber(statsRow.open_tickets),
        resolved: toNumber(statsRow.resolved_tickets),
        closed: toNumber(statsRow.closed_tickets),
        total: toNumber(statsRow.total),
        aiResolved: toNumber(statsRow.ai_resolved),
        aiResolvedPercent: toNumber(statsRow.ai_resolved_percent),
        averageResolutionTimeSeconds: toNullableNumber(
          statsRow.average_resolution_time_seconds
        )
      },
      ticketsByDay: parseJsonArray<TicketsByDayItem>(statsRow.tickets_by_day),
      countsByCategory: parseJsonArray<CountByCategoryItem>(statsRow.counts_by_category),
      recentTickets
    });
  })
);

function toNumber(value: number | bigint | string) {
  return Number(value);
}

function toNullableNumber(value: number | bigint | null) {
  return value === null ? null : Number(value);
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "string") {
    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  }

  return [];
}
