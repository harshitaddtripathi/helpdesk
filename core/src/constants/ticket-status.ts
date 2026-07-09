export const TicketStatus = {
  open: "open",
  resolved: "resolved",
  closed: "closed"
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
