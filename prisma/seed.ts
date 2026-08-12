// Database seed — creates the initial platform super-admin.
//
// This runs as a plain Node script (via `tsx`), OUTSIDE Next.js. So it can't
// import our app modules that are marked `server-only` (session.ts, dal.ts,
// password.ts). Instead it builds its own Prisma client and hashes the
// password with bcrypt directly. `import "dotenv/config"` (first line) loads
// .env so DATABASE_URL and the SEED_ADMIN_* vars are available.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // upsert = create if missing, otherwise leave existing row untouched.
  // This makes the seed safe to run repeatedly without creating duplicates.
  const admin = await db.user.upsert({
    where: { email },
    update: {}, // don't overwrite an existing admin's password on re-seed
    create: {
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      businessId: null, // platform admins belong to no single business
    },
  });

  console.log(`✅ Super-admin ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
