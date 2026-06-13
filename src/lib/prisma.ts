import { PrismaClient } from "@prisma/client";

declare global {
  // allow global caching in dev to avoid creating many clients
  // eslint-disable-next-line no-var
  var __prisma?: PrismaClient;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}