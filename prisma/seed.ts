import { PrismaClient, UserRole } from "@prisma/client";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists; skipping.`);
    return;
  }

  const userId = generateId();
  const passwordHash = await hashPassword(adminPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: adminEmail,
        name: "Admin",
        role: UserRole.admin,
        active: true
      }
    });

    await tx.account.create({
      data: {
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash
      }
    });
  });

  console.log(`Created admin user ${adminEmail}.`);
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
