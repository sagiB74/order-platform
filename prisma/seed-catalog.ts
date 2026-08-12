// Demo catalog seed — fills a business with realistic gluten-free products so
// the owner dashboard (and later the storefront) has something real to show.
//
// These are PLACEHOLDERS. Once we know Hila's actual products, edit or delete
// them from the dashboard. Runs as a plain Node script (via tsx), like seed.ts.
//
// Target: the business whose slug matches DEMO_BUSINESS_SLUG, or — if that's not
// set — the oldest business (your first "test business"). Idempotent: it only
// creates a category/product if one with the same name doesn't already exist,
// so it's safe to run repeatedly.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// name -> price in agorot (integer). Grouped by the category they belong to.
const CATALOG: Record<string, { name: string; priceCents: number; description?: string }[]> = {
  Breads: [
    { name: "Gluten-Free Challah", priceCents: 3800, description: "Braided, soft, pareve" },
    { name: "Country Sourdough Loaf", priceCents: 4200, description: "Crackly crust, tangy crumb" },
  ],
  Cakes: [
    { name: "Chocolate Babka", priceCents: 5500, description: "Rich chocolate swirl, dairy-free" },
    { name: "Cinnamon Babka", priceCents: 5500, description: "Cinnamon-sugar ribbons" },
  ],
  Cookies: [
    { name: "Kinder Crumble Cookies", priceCents: 4000, description: "Box of 6" },
    { name: "Amsterdam Crumble Cookies", priceCents: 4000, description: "Box of 6" },
    { name: "Choco-Chip Crumble Cookies", priceCents: 3800, description: "Box of 6" },
    { name: "Party Crumble Cookies", priceCents: 4200, description: "Box of 6, sprinkles" },
  ],
};

async function main() {
  const slug = process.env.DEMO_BUSINESS_SLUG;
  const business = slug
    ? await db.business.findUnique({ where: { slug } })
    : await db.business.findFirst({ orderBy: { createdAt: "asc" } });

  if (!business) {
    throw new Error(
      slug
        ? `No business found with slug "${slug}".`
        : "No businesses exist yet. Create one in /admin first.",
    );
  }

  console.log(`Seeding demo catalog into "${business.name}" (/${business.slug})`);

  let createdCategories = 0;
  let createdProducts = 0;
  let sortOrder = 0;

  for (const [categoryName, items] of Object.entries(CATALOG)) {
    // Find-or-create the category (no unique constraint on name+businessId, so
    // we look it up manually to stay idempotent).
    let category = await db.category.findFirst({
      where: { businessId: business.id, name: categoryName },
    });
    if (!category) {
      category = await db.category.create({
        data: { businessId: business.id, name: categoryName, sortOrder: sortOrder++ },
      });
      createdCategories++;
    }

    for (const item of items) {
      const exists = await db.product.findFirst({
        where: { businessId: business.id, name: item.name },
        select: { id: true },
      });
      if (exists) continue;
      await db.product.create({
        data: {
          businessId: business.id,
          categoryId: category.id,
          name: item.name,
          priceCents: item.priceCents,
          description: item.description ?? null,
          // inventoryMode defaults to UNLIMITED (orderable) via the schema.
        },
      });
      createdProducts++;
    }
  }

  console.log(
    `✅ Done. Added ${createdCategories} categories, ${createdProducts} products ` +
      `(existing ones were left untouched).`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Catalog seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
