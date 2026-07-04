import { UserRole } from "@prisma/client";
import { createEmailPasswordUser, setCredentialPassword } from "../server/src/lib/auth";
import { prisma } from "../server/src/lib/prisma";


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

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() }
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: "Admin",
        role: UserRole.ADMIN,
        active: true
      }
    });
    await setCredentialPassword(existingAdmin.id, adminPassword);
    return;
  }

  await createEmailPasswordUser({
    email: adminEmail,
    name: "Admin",
    password: adminPassword,
    role: UserRole.ADMIN
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
