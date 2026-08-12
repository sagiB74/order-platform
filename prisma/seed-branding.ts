// Seed the demo business's storefront branding into the existing Business.branding
// JSON (no schema change). Sets the about paragraph + logo path used by the
// public storefront. Idempotent — safe to re-run.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const ABOUT_TEXT =
  "המאפייה שלי נולדה מתוך אהבה לאפייה ומתוך צורך אישי ליצור מאפים ללא גלוטן שלא מתפשרים על טעם, מרקם או חומרי גלם. למרות שהמטבח שלי אינו סטרילי מגלוטן, אני מקפידה על ניקיון והפרדה בתהליך העבודה כדי לתת לכם מוצרים איכותיים ומלאי אהבה בבטיחות המרבית.";

// Hero seal/tagline copy — small text lines shown inside/under the storefront
// hero's circular badge (src/app/[slug]/hero.tsx).
const SEAL_TAGLINE = "טרי, ביתי, מלא בטעם";
const SEAL_NOTE = "עלול להכיל אהבה";
const HERO_TAGLINE = "ששש... אם לא תגלו אף אחד לא ידע שזה בלי גלוטן..";

async function main() {
  const slug = process.env.DEMO_BUSINESS_SLUG ?? "test";
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) throw new Error(`No business with slug "${slug}".`);

  const existing =
    business.branding && typeof business.branding === "object"
      ? (business.branding as Record<string, unknown>)
      : {};

  await db.business.update({
    where: { slug },
    data: {
      branding: {
        ...existing,
        logoUrl: "/hila-logo-text.jpeg",
        aboutText: ABOUT_TEXT,
        sealTagline: SEAL_TAGLINE,
        sealNote: SEAL_NOTE,
        heroTagline: HERO_TAGLINE,
      },
    },
  });

  console.log(`✅ Branding set for "${business.name}" (/${slug}).`);
}

main()
  .catch((err) => {
    console.error("❌ Branding seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
