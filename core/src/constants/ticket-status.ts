export const ticketStatuses = ["open", "resolved", "closed"] as const;

export type TicketStatus = (typeof ticketStatuses)[number];

export const TicketStatus: Record<TicketStatus, TicketStatus> = {
  open: "open",
  resolved: "resolved",
  closed: "closed"
} as const;
