export type TicketCategory =
  | "general_question"
  | "technical_question"
  | "refund_request";

export const TicketCategory = {
  GeneralQuestion: "general_question",
  TechnicalQuestion: "technical_question",
  RefundRequest: "refund_request"
} as const satisfies Record<string, TicketCategory>;
