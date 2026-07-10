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

export const inboundEmailSchema = z.object({
  from: z.string().trim().email(),
  fromName: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  bodyHtml: z.string().optional(),
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
  category: z.enum(ticketCategoryFilters).default("all")
});

export type TicketSortField = (typeof sortableColumns)[number];
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
