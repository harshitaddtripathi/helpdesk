import { z } from "zod";
import { TicketCategory, ticketCategories } from "../constants/ticket-category";
import { ticketStatuses } from "../constants/ticket-status";

export const sortableColumns = [
  "subject",
  "senderName",
  "status",
  "category",
  "createdAt"
] as const;

const inboundEmailMaxLengths = {
  from: 254,
  fromName: 250,
  subject: 255,
  body: 1000,
  bodyHtml: 2000
} as const;

export const inboundEmailSchema = z.object({
  from: z.string().trim().email().max(inboundEmailMaxLengths.from),
  fromName: z.string().trim().min(1).max(inboundEmailMaxLengths.fromName),
  subject: z.string().trim().min(1).max(inboundEmailMaxLengths.subject),
  body: z.string().trim().min(1).max(inboundEmailMaxLengths.body),
  bodyHtml: z.string().max(inboundEmailMaxLengths.bodyHtml).optional(),
  category: z.nativeEnum(TicketCategory).optional()
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

const ticketStatusFilters = ["all", ...ticketStatuses] as const;
const ticketCategoryFilters = ["all", "uncategorized", ...ticketCategories] as const;

export const ticketListQuerySchema = z.object({
  sortBy: z.enum(sortableColumns).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().max(100).default(""),
  status: z.enum(ticketStatusFilters).default("all"),
  category: z.enum(ticketCategoryFilters).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export type TicketSortField = (typeof sortableColumns)[number];
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
