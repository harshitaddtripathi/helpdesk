import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "./env";
import { prisma } from "./prisma";

export const auth = betterAuth({
  appName: "AI Helpdesk",
  basePath: "/api/auth",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CLIENT_ORIGIN],
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash)
    }
  },
  user: {
    additionalFields: {
      role: {
        type: ["ADMIN", "AGENT"],
        required: false,
        defaultValue: "AGENT",
        input: false
      },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false
      }
    }
  }
});

export async function hashAuthPassword(password: string) {
  const context = await auth.$context;
  return context.password.hash(password);
}

export async function setCredentialPassword(userId: string, password: string) {
  const passwordHash = await hashAuthPassword(password);

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: userId
      }
    },
    update: {
      password: passwordHash,
      userId
    },
    create: {
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash
    }
  });
}

export async function createEmailPasswordUser({
  email,
  name,
  password,
  role = UserRole.AGENT
}: {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}) {
  const result = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password
    }
  });

  const user = await prisma.user.update({
    where: { id: result.user.id },
    data: {
      role,
      active: true
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

  return user;
}
