import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/require-auth";

export const knowledgeBaseRouter = Router();

const articleSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  categorySlug: z.string().optional(),
  active: z.boolean().optional()
});

knowledgeBaseRouter.use(requireAuth);

knowledgeBaseRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { body: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      include: { category: true },
      orderBy: { updatedAt: "desc" }
    });

    res.json({ articles });
  })
);

knowledgeBaseRouter.post(
  "/",
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const body = articleSchema.parse(req.body);
    const category = body.categorySlug
      ? await prisma.category.findUnique({ where: { slug: body.categorySlug } })
      : null;

    if (body.categorySlug && !category) {
      throw new HttpError(400, "Unknown category.");
    }

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title: body.title,
        body: body.body,
        active: body.active ?? true,
        categoryId: category?.id
      },
      include: { category: true }
    });

    res.status(201).json({ article });
  })
);
