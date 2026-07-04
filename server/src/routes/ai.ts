import { Router } from "express";
import { z } from "zod";
import { env } from "../lib/env";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/require-auth";

export const aiRouter = Router();

aiRouter.use(requireAuth);

const aiActionSchema = z.object({
  ticketId: z.string().min(1)
});

aiRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({
      provider: "codex",
      configured: Boolean(env.CODEX_API_KEY)
    });
  })
);

aiRouter.post(
  "/classify",
  asyncHandler(async (req, res) => {
    const body = aiActionSchema.parse(req.body);
    await ensureTicketExists(body.ticketId);
    ensureAiConfigured();
    res.status(501).json({ message: "Codex classification is not implemented yet." });
  })
);

aiRouter.post(
  "/summarize",
  asyncHandler(async (req, res) => {
    const body = aiActionSchema.parse(req.body);
    await ensureTicketExists(body.ticketId);
    ensureAiConfigured();
    res.status(501).json({ message: "Codex summaries are not implemented yet." });
  })
);

aiRouter.post(
  "/suggest-reply",
  asyncHandler(async (req, res) => {
    const body = aiActionSchema.parse(req.body);
    await ensureTicketExists(body.ticketId);
    ensureAiConfigured();
    res.status(501).json({ message: "Codex suggested replies are not implemented yet." });
  })
);

async function ensureTicketExists(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) {
    throw new HttpError(404, "Ticket not found.");
  }
}

function ensureAiConfigured() {
  if (!env.CODEX_API_KEY) {
    throw new HttpError(501, "CODEX_API_KEY is not configured.");
  }
}
