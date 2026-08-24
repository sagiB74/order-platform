// Businesses module — all logic for creating and listing tenants.
//
// WHY a service layer: routes/actions stay thin and this file owns the rules
// and the database access. Crucially, EVERY function takes a TenantContext and
// checks it first, so isolation is enforced here, close to the data — not left
// to the UI to remember.
//
// Only the platform super-admin may create or list all businesses, so each
// function guards `ctx.kind === "platform"` and throws otherwise.
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/modules/auth/password";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import type { TenantContext } from "@/modules/tenant/context";

// Input validation. A slug must be URL-safe: lowercase letters/numbers with
// single hyphens between them (e.g. "gluten-free-home").
export const CreateBusinessInput = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: "Slug must be lowercase letters, numbers, and single hyphens.",
    }),
  // Lowercased so the stored value always matches what the login action looks
  // up (it normalises the same way). Without this, an owner created as
  // "Owner@x.com" could never sign in.
  ownerEmail: z
    .email({ error: "Enter a valid owner email." })
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  ownerPassword: z
    .string()
    .min(8, { error: "Owner password must be at least 8 characters." }),
});
export type CreateBusinessInput = z.infer<typeof CreateBusinessInput>;

/**
 * Create a business AND its owner account, atomically.
 * Platform-admin only.
 */
export async function createBusiness(
  ctx: TenantContext,
  input: CreateBusinessInput,
) {
  // Authorization: only the platform admin.
  if (ctx.kind !== "platform") {
    throw new ForbiddenError("Only the platform admin can create businesses.");
  }

  // Friendly pre-checks (the DB's unique constraints are the real backstop).
  const [slugTaken, emailTaken] = await Promise.all([
    db.business.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    db.user.findUnique({ where: { email: input.ownerEmail }, select: { id: true } }),
  ]);
  if (slugTaken) throw new ValidationError(`The link "/${input.slug}" is already taken.`);
  if (emailTaken) throw new ValidationError("That owner email is already in use.");

  const passwordHash = await hashPassword(input.ownerPassword);

  // A transaction: either BOTH the business and its owner are created, or
  // neither is. We never want a business with no way to log in, or an owner
  // pointing at a business that failed to save.
  const business = await db.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: { name: input.name, slug: input.slug },
    });
    await tx.user.create({
      data: {
        email: input.ownerEmail,
        passwordHash,
        role: "BUSINESS_OWNER",
        businessId: b.id, // ties the owner to this tenant
      },
    });
    return b;
  });

  return business;
}

/** List all businesses with their owner's email. Platform-admin only. */
export async function listBusinesses(ctx: TenantContext) {
  if (ctx.kind !== "platform") {
    throw new ForbiddenError("Only the platform admin can list all businesses.");
  }
  return db.business.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      users: {
        where: { role: "BUSINESS_OWNER" },
        select: { email: true },
        take: 1,
      },
    },
  });
}
