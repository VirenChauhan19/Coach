import { PrismaClient } from "@prisma/client";

// One client per process, in every environment. In development this survives
// hot-reloads; in production it guards against a bundler evaluating this module
// more than once and quietly opening extra database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
