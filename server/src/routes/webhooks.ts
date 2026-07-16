import { Router } from "express";
import { inboundEmailSchema } from "core/schemas/tickets";
import { asyncHandler } from "../lib/http";
import { receiveInboundEmail } from "../lib/inbound-email";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/inbound-email",
  requireWebhookSecret,
  asyncHandler(async (req, res) => {
    const body = inboundEmailSchema.parse(req.body);
    const result = await receiveInboundEmail(body);

    if (result.status === "appended") {
      res.status(200).json({ ticket: result.ticket, message: result.message });
      return;
    }

    res.status(201).json({ ticket: result.ticket });
  })
);
