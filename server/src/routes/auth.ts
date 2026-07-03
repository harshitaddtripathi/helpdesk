import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../lib/env";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { createSession, deleteSessionToken } from "../lib/sessions";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user || !user.active) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);

    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const session = await createSession(user.id);

    res.cookie(env.SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteSessionToken(req.sessionToken);
    res.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
    res.status(204).send();
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

