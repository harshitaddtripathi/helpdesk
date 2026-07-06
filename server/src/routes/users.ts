import { Router } from "express";
import { z } from "zod";
import { UserRole } from "../lib/auth";
import { createEmailPasswordUser } from "../lib/auth";
import { asyncHandler, HttpError, requireStringParam } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/require-auth";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole(UserRole.admin));

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
    const email = body.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new HttpError(409, "A user with this email already exists.");
    }

    const user = await createEmailPasswordUser({
      email,
      name: body.name,
      password: body.password,
      role: UserRole.agent
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
