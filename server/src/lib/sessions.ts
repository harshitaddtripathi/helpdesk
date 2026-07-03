import crypto from "node:crypto";
import { env } from "./env";
import { prisma } from "./prisma";

export function hashSessionToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(`${env.SESSION_SECRET}:${token}`)
    .digest("hex");
}

export async function createSession(userId: string) {
  const token = `${crypto.randomUUID()}.${crypto.randomBytes(32).toString("hex")}`;
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function deleteSessionToken(token: string | undefined) {
  if (!token) return;

  await prisma.session.deleteMany({
    where: {
      tokenHash: hashSessionToken(token)
    }
  });
}

