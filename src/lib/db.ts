// The database client — our single entry point to Postgres.
//
// WHY a singleton: in dev, Next.js hot-reloads modules constantly. Creating a
// `new PrismaClient()` on every reload would open a new pool of DB connections
// each time and quickly exhaust the database. We cache one instance on
// `globalThis` so reloads reuse it. In production the module loads once, so the
// guard is a no-op.
//
// Prisma 7 note: the client no longer reads the URL from the schema. We pass a
// `PrismaPg` driver adapter built from DATABASE_URL instead.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
