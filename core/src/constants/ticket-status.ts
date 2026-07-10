export type TicketStatus = "open" | "resolved" | "closed";

export const TicketStatus: Record<TicketStatus, TicketStatus> = {
  open: "open",
  resolved: "resolved",
  closed: "closed"
} as const;
