// Replace the demo catalog with Hila's REAL menu (Hebrew names, categories,
// prices from her menu). Deletes the business's existing products + categories
// first, then recreates hers, so re-running is clean and idempotent.
//
// Existing orders are NOT lost: OrderItem keeps snapshotted names/prices, and the
// productId link is set to null on delete (schema onDelete: SetNull). So the
// schedule/stats keep their history; only the live catalog is refreshed.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// name -> priceCents (agorot). Grouped by category, in display order.
const CATALOG: {
  category: string;
  items: { name: string; priceCents: number; description: string }[];
}[] = [
  {
    category: "המוציא לחם מן הארץ",
    items: [
      { name: "חלה טריה לשבת", priceCents: 3500, description: "חלה קלועה רכה, לכבוד שבת" },
      { name: "מארז ארבע לחמניות", priceCents: 2800, description: "ארבע לחמניות ביתיות רכות" },
    ],
  },
  {
    category: "עוגות ומאפים",
    items: [
      { name: "עוגת שוקולד", priceCents: 5500, description: "עוגת שוקולד עשירה" },
      { name: "עוגת שמרים שוקולד", priceCents: 6500, description: "בבקת שמרים במילוי שוקולד" },
      { name: "עוגת סינבונים", priceCents: 2100, description: "רולים של קינמון · מארז ₪65" },
    ],
  },
  {
    category: "עוגיות ונשנושים",
    items: [
      { name: "עוגיות מרוקאיות אסליות", priceCents: 4500, description: "עוגיות מרוקאיות מסורתיות" },
      { name: "עוגיות שוקולד צ׳יפס קלאסיות", priceCents: 4500, description: "עם המון שוקולד צ׳יפס" },
      { name: "מארז רוגלך רכים", priceCents: 5000, description: "רוגלך רכים במילוי" },
      { name: "קראמבל קוקיז — רביעייה", priceCents: 5500, description: "קינדר · אמסטרדם · שוקולד צ׳יפס · פארטי" },
    ],
  },
];

async function main() {
  const slug = process.env.DEMO_BUSINESS_SLUG ?? "test";
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) throw new Error(`No business with slug "${slug}".`);

  // Clear the old catalog (products first, then categories).
  await db.product.deleteMany({ where: { businessId: business.id } });
  await db.category.deleteMany({ where: { businessId: business.id } });

  let created = 0;
  let sortOrder = 0;
  for (const group of CATALOG) {
    const category = await db.category.create({
      data: { businessId: business.id, name: group.category, sortOrder: sortOrder++ },
    });
    let itemOrder = 0;
    for (const item of group.items) {
      await db.product.create({
        data: {
          businessId: business.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          // inventoryMode defaults to UNLIMITED (orderable) via the schema —
          // this replaced the old isAvailable boolean.
          sortOrder: itemOrder++,
        },
      });
      created++;
    }
  }

  console.log(`✅ Reseeded Hila's real menu for "${business.name}" (/${slug}): ${created} products.`);
}

main()
  .catch((err) => {
    console.error("❌ Catalog reseed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
