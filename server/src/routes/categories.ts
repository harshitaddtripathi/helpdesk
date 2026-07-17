import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/require-auth";

export const categoriesRouter = Router();
const categorySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional()
});

categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" }
    });

    res.json({ categories });
  })
);

categoriesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = categorySchema.parse(req.body);
    const slug = body.slug ? slugify(body.slug) : slugify(body.name);

    if (!slug) {
      throw new HttpError(400, "Category name must contain letters or numbers.");
    }

    const existingCategory = await prisma.category.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (existingCategory) {
      throw new HttpError(409, "A category with this slug already exists.");
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug
      }
    });

    res.status(201).json({ category });
  })
);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
