import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../lib/env";
import { HttpError } from "../lib/http";

export const requireWebhookSecret: RequestHandler = (req, _res, next) => {
  if (!env.WEBHOOK_SECRET) {
    next(new HttpError(500, "Webhook secret is not configured."));
    return;
  }

  const suppliedSecret = req.get("x-webhook-secret") ?? getQuerySecret(req.query.secret);

  if (!suppliedSecret || !constantTimeEquals(suppliedSecret, env.WEBHOOK_SECRET)) {
    next(new HttpError(401, "Invalid webhook secret."));
    return;
  }

  next();
};

function getQuerySecret(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
