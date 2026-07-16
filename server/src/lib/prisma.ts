import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const adapter = new PrismaPg({ connectionString: env.DIRECT_URL ?? env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
