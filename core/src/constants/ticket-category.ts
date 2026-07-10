export const ticketCategories = [
  "general_question",
  "technical_question",
  "refund_request"
] as const;

export type TicketCategory = (typeof ticketCategories)[number];

export const TicketCategory = {
  GeneralQuestion: "general_question",
  TechnicalQuestion: "technical_question",
  RefundRequest: "refund_request"
} as const satisfies Record<string, TicketCategory>;
