import type { RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: {
        disableCookieCache: true
      }
    });

    if (!authSession?.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const appUser = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: {
        role: true,
        active: true
      }
    });

    if (!appUser?.active) {
      res.status(401).json({ message: "Session is invalid or expired." });
      return;
    }

    req.session = authSession.session;
    req.user = {
      ...authSession.user,
      role: appUser.role,
      active: appUser.active
    };
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
