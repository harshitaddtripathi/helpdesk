import { z } from "zod";
import { TicketCategory } from "../constants/ticket-category";

export const inboundEmailSchema = z.object({
  from: z.string().trim().email(),
  fromName: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  bodyHtml: z.string().optional(),
  category: z
    .enum([
      TicketCategory.general_question,
      TicketCategory.technical_question,
      TicketCategory.refund_request
    ])
    .optional()
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
