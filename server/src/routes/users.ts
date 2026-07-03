import bcrypt from "bcryptjs";
import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { asyncHandler, HttpError, requireStringParam } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole(UserRole.ADMIN));

const createAgentSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8)
});

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional()
});

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    res.json({ users });
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createAgentSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (existingUser) {
      throw new HttpError(409, "A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: UserRole.AGENT
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    res.status(201).json({ user });
  })
);

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = requireStringParam(req.params.id, "id");
    const body = updateAgentSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    res.json({ user });
  })
);
