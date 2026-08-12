// Demo PENDING orders — stands in for a future real "customer checkout creates
// a pending order" intake queue (that's Phase 5). For now this just seeds a
// handful of orders sitting in PENDING so the schedule's approval sidebar has
// something real to approve/reject against. Idempotent: skips if the target
// business already has any pending orders.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

type DemoPendingOrder = {
  dayOffset: number;
  hour: number;
  minute: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  lines: { product: string; quantity: number }[];
};

const DEMO_PENDING: DemoPendingOrder[] = [
  {
    dayOffset: 2, hour: 13, minute: 0, customerName: "שירה אבני", customerPhone: "050-666-1122",
    lines: [{ product: "חלה טריה לשבת", quantity: 2 }],
  },
  {
    dayOffset: 3, hour: 10, minute: 30, customerName: "רון גבאי", customerPhone: "052-444-7788",
    notes: "אלרגיה לאגוזים",
    lines: [{ product: "עוגת שוקולד", quantity: 1 }, { product: "עוגיות מרוקאיות אסליות", quantity: 1 }],
  },
  {
    dayOffset: 5, hour: 16, minute: 0, customerName: "ליאור כהן", customerPhone: "054-999-3311",
    lines: [{ product: "מארז ארבע לחמניות", quantity: 1 }],
  },
];

function pickupDate(dayOffset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const slug = process.env.DEMO_BUSINESS_SLUG;
  const business = slug
    ? await db.business.findUnique({ where: { slug } })
    : await db.business.findFirst({ orderBy: { createdAt: "asc" } });
  if (!business) throw new Error("No business found. Create one and seed the catalog first.");

  const existingPending = await db.order.count({
    where: { businessId: business.id, status: "PENDING" },
  });
  if (existingPending > 0) {
    console.log(
      `"${business.name}" already has ${existingPending} pending orders — skipping demo seed.`,
    );
    return;
  }

  const products = await db.product.findMany({
    where: { businessId: business.id },
    select: { id: true, name: true, priceCents: true },
  });
  const byName = new Map(products.map((p) => [p.name, p]));
  if (products.length === 0) {
    throw new Error("No products found. Run `npm run db:seed:catalog` first.");
  }

  let created = 0;
  for (const o of DEMO_PENDING) {
    const items = o.lines.map((l) => {
      const p = byName.get(l.product);
      if (!p) throw new Error(`Demo product "${l.product}" not found in catalog.`);
      return {
        businessId: business.id,
        productId: p.id,
        nameSnapshot: p.name,
        priceCentsSnapshot: p.priceCents,
        quantity: l.quantity,
      };
    });

    await db.order.create({
      data: {
        businessId: business.id,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        pickupAt: pickupDate(o.dayOffset, o.hour, o.minute),
        status: "PENDING",
        notes: o.notes ?? null,
        items: { create: items },
      },
    });
    created++;
  }

  console.log(`✅ Created ${created} demo PENDING orders for "${business.name}" (/${business.slug}).`);
}

main()
  .catch((err) => {
    console.error("❌ Pending-order seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
