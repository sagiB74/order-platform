// Historical demo orders — the other seeds only cover "today ± a few days",
// which is fine for the schedule view but leaves the stats page's 12-month
// revenue chart showing 11 zeros and one spike. This backfills the 11
// calendar months BEFORE the current one with a spread of DONE orders, so the
// chart/KPIs have real variation to show. Deliberately stops at last month,
// not this one — this month's own numbers come from the live seeds
// (seed-orders.ts / seed-pending-orders.ts), so there's no overlap to reason
// about.
//
// Deterministic (fixed PRNG seed): reruns produce the exact same data, so this
// is safe to read about / diff, not a source of flaky demo numbers.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { lastMonths, monthRange } from "../src/lib/schedule";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Small deterministic PRNG (mulberry32) — plenty for "pick a plausible day /
// customer / product mix", not for anything security-sensitive.
function mulberry32(seed: number) {
  let s = seed;
  return function rand() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  { name: "שירה אבני", phone: "050-666-1122" },
  { name: "רון גבאי", phone: "052-444-7788" },
  { name: "ליאור כהן", phone: "054-999-3311" },
  { name: "דנה לוי", phone: "050-123-4567" },
  { name: "יוסי כהן", phone: "052-987-6543" },
  { name: "מאיה בר", phone: "054-222-3344" },
  { name: "נועה שני", phone: "053-777-8899" },
  { name: "אבי מזרחי", phone: "050-555-1212" },
  { name: "תמר גולן", phone: "058-444-2211" },
  { name: "איתן פרץ", phone: "052-333-9090" },
];

const SEED = 20260811; // arbitrary, fixed
const ORDERS_PER_MONTH_MIN = 8;
const ORDERS_PER_MONTH_MAX = 16;
const HISTORY_MONTHS = 11; // last 11 full months, excluding the current one

function randomInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

async function main() {
  const slug = process.env.DEMO_BUSINESS_SLUG;
  const business = slug
    ? await db.business.findUnique({ where: { slug } })
    : await db.business.findFirst({ orderBy: { createdAt: "asc" } });
  if (!business) throw new Error("No business found. Create one and seed the catalog first.");

  // Idempotency: skip if this business already has an order older than ~40
  // days — that can only be history we (or a previous run of this script)
  // already seeded, since the other demo seeds only write future/near-today
  // orders.
  const oldest = await db.order.findFirst({
    where: { businessId: business.id },
    orderBy: { pickupAt: "asc" },
    select: { pickupAt: true },
  });
  const fortyDaysAgo = new Date();
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
  if (oldest && oldest.pickupAt < fortyDaysAgo) {
    console.log(`"${business.name}" already has order history — skipping.`);
    return;
  }

  const products = await db.product.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, priceCents: true },
  });
  if (products.length === 0) {
    throw new Error("No products found. Run `npm run db:seed:catalog` first.");
  }

  const rand = mulberry32(SEED);
  const now = new Date();
  // lastMonths(..., HISTORY_MONTHS + 1) ending at THIS month, then drop the
  // last entry (the current month) — leaves exactly the HISTORY_MONTHS prior.
  const months = lastMonths(now.getFullYear(), now.getMonth(), HISTORY_MONTHS + 1).slice(0, -1);

  let created = 0;
  for (const { year, monthIndex } of months) {
    const { start } = monthRange(year, monthIndex);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const orderCount = randomInt(rand, ORDERS_PER_MONTH_MIN, ORDERS_PER_MONTH_MAX);

    for (let i = 0; i < orderCount; i++) {
      const day = randomInt(rand, 1, daysInMonth);
      const hour = randomInt(rand, 9, 18);
      const minute = pick(rand, [0, 15, 30, 45]);
      const pickupAt = new Date(start);
      pickupAt.setDate(day);
      pickupAt.setHours(hour, minute, 0, 0);

      const customer = pick(rand, CUSTOMERS);
      const lineCount = randomInt(rand, 1, 3);
      const chosenProducts = new Set<string>();
      while (chosenProducts.size < lineCount && chosenProducts.size < products.length) {
        chosenProducts.add(pick(rand, products).id);
      }
      const byId = new Map(products.map((p) => [p.id, p]));
      const items = [...chosenProducts].map((id) => {
        const p = byId.get(id)!;
        return {
          businessId: business.id,
          productId: p.id,
          nameSnapshot: p.name,
          priceCentsSnapshot: p.priceCents,
          quantity: randomInt(rand, 1, 3),
        };
      });

      await db.order.create({
        data: {
          businessId: business.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          pickupAt,
          status: "DONE", // history is settled — never PENDING/OPEN
          items: { create: items },
        },
      });
      created++;
    }
  }

  console.log(
    `✅ Created ${created} historical demo orders across ${months.length} months for "${business.name}" (/${business.slug}).`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Order history seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
