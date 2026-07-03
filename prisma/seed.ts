import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "General questions", slug: "general-questions" },
  { name: "Technical questions", slug: "technical-questions" },
  { name: "Refund request", slug: "refund-request" }
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category
    });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin",
      role: UserRole.ADMIN,
      active: true
    },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: UserRole.ADMIN
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

