export const TicketCategory = {
  general_question: "general_question",
  technical_question: "technical_question",
  refund_request: "refund_request"
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];
