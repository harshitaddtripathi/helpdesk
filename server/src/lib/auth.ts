import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { env } from "./env";
import { prisma } from "./prisma";

export { UserRole };

export const auth = betterAuth({
  appName: "AI Helpdesk",
  basePath: "/api/auth",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS,
  ...(env.NODE_ENV === "production"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
            partitioned: true
          }
        }
      }
    : {}),
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: false,
    minPasswordLength: 8,
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => {
        if (/^\$2[aby]\$/.test(hash)) {
          return bcrypt.compare(password, hash);
        }

        return verifyPassword({ hash, password });
      }
    }
  },
  user: {
    additionalFields: {
      role: {
        type: [UserRole.admin, UserRole.agent],
        required: true,
        defaultValue: UserRole.agent,
        input: false
      },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false
      },
      deletedAt: {
        type: "date",
        required: false,
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
  role = UserRole.agent
}: {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}) {
  const passwordHash = await hashAuthPassword(password);
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        name,
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

    await tx.account.create({
      data: {
        accountId: createdUser.id,
        providerId: "credential",
        userId: createdUser.id,
        password: passwordHash
      }
    });

    return createdUser;
  });

  return user;
}
