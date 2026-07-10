import { z } from "zod";
import { TicketCategory } from "../constants/ticket-category";

export const sortableColumns = [
  "subject",
  "senderName",
  "status",
  "category",
  "createdAt"
] as const;

export const inboundEmailSchema = z.object({
  from: z.string().trim().email(),
  fromName: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  bodyHtml: z.string().optional(),
  category: z.nativeEnum(TicketCategory).optional()
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

export const ticketListQuerySchema = z.object({
  sortBy: z.enum(sortableColumns).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export type TicketSortField = (typeof sortableColumns)[number];
