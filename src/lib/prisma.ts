import 'dotenv/config'
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // allow global caching in dev to avoid creating many clients
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = global.__prisma ?? new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}