// Demo orders seed — spreads a handful of realistic orders across the next few
// days so the owner's schedule has something to show. Idempotent: if the target
// business already has orders, it does nothing.
//
// Prices/names are SNAPSHOT from the current products at seed time, exactly like
// a real order would be.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// dayOffset = days from today; time is local. Each line references a product by
// its name (must match the catalog seed) plus a quantity.
type DemoOrder = {
  dayOffset: number;
  hour: number;
  minute: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  done?: boolean;
  lines: { product: string; quantity: number }[];
};

const DEMO_ORDERS: DemoOrder[] = [
  {
    dayOffset: 0, hour: 10, minute: 0, customerName: "Dana Levi", customerPhone: "050-123-4567",
    lines: [{ product: "Gluten-Free Challah", quantity: 2 }, { product: "Chocolate Babka", quantity: 1 }],
  },
  {
    dayOffset: 0, hour: 16, minute: 30, customerName: "Yossi Cohen", customerPhone: "052-987-6543",
    notes: "Nut allergy — please keep separate.",
    lines: [{ product: "Kinder Crumble Cookies", quantity: 1 }, { product: "Party Crumble Cookies", quantity: 1 }],
  },
  {
    dayOffset: 1, hour: 9, minute: 0, customerName: "Maya Bar", customerPhone: "054-222-3344",
    lines: [{ product: "Gluten-Free Challah", quantity: 3 }],
  },
  {
    dayOffset: 1, hour: 17, minute: 15, customerName: "Noa Shani", customerPhone: "053-777-8899",
    lines: [{ product: "Cinnamon Babka", quantity: 1 }, { product: "Choco-Chip Crumble Cookies", quantity: 2 }],
  },
  {
    dayOffset: 2, hour: 12, minute: 0, customerName: "Avi Mizrahi", customerPhone: "050-555-1212", done: true,
    lines: [{ product: "Country Sourdough Loaf", quantity: 1 }, { product: "Amsterdam Crumble Cookies", quantity: 1 }],
  },
  {
    dayOffset: 3, hour: 15, minute: 0, customerName: "Tamar Golan", customerPhone: "058-444-2211",
    lines: [{ product: "Chocolate Babka", quantity: 2 }],
  },
  {
    dayOffset: 4, hour: 11, minute: 30, customerName: "Eitan Peretz", customerPhone: "052-333-9090",
    lines: [{ product: "Gluten-Free Challah", quantity: 1 }, { product: "Kinder Crumble Cookies", quantity: 2 }],
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

  const existing = await db.order.count({ where: { businessId: business.id } });
  if (existing > 0) {
    console.log(`"${business.name}" already has ${existing} orders — skipping demo seed.`);
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
  for (const o of DEMO_ORDERS) {
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
        status: o.done ? "DONE" : "OPEN",
        notes: o.notes ?? null,
        items: { create: items },
      },
    });
    created++;
  }

  console.log(`✅ Created ${created} demo orders for "${business.name}" (/${business.slug}).`);
}

main()
  .catch((err) => {
    console.error("❌ Order seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
