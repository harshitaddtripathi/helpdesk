import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({ connectionString: readEnv("DIRECT_URL") ?? requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

function requireEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readEnv(name: string) {
  return process.env[name]?.trim();
}

async function ensureSeedUser({ email, name, password, role }: SeedUser) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  const passwordHash = await hashPassword(password);

  if (existingUser) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role,
          active: true
        }
      });

      await tx.account.upsert({
        where: {
          providerId_accountId: {
            providerId: "credential",
            accountId: existingUser.id
          }
        },
        update: {
          password: passwordHash,
          userId: existingUser.id
        },
        create: {
          id: generateId(),
          accountId: existingUser.id,
          providerId: "credential",
          userId: existingUser.id,
          password: passwordHash
        }
      });
    });

    console.log(`Seed user ${normalizedEmail} already exists; updated.`);
    return;
  }

  const userId = generateId();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        name,
        role,
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

  console.log(`Created seed user ${normalizedEmail}.`);
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const agentPassword = process.env.SEED_AGENT_PASSWORD?.trim() || adminPassword;

  const seedUsers: SeedUser[] = [
    {
      email: adminEmail,
      name: "Admin",
      password: adminPassword,
      role: UserRole.admin
    },
    {
      email: "ai-agent@example.com",
      name: "AI-Agent",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "alex.agent@example.com",
      name: "Alex Morgan",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "jordan.agent@example.com",
      name: "Jordan Lee",
      password: agentPassword,
      role: UserRole.agent
    },
    {
      email: "priya.agent@example.com",
      name: "Priya Shah",
      password: agentPassword,
      role: UserRole.agent
    }
  ];

  for (const seedUser of seedUsers) {
    await ensureSeedUser(seedUser);
  }
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
