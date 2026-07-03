import type { RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { env } from "../lib/env";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { hashSessionToken } from "../lib/sessions";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new HttpError(401, "Authentication required.");
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });

    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      throw new HttpError(401, "Session is invalid or expired.");
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role
    };
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have permission for this action."));
      return;
    }

    next();
  };
}

