// Small helpers for reading Server Action FormData safely.
//
// Server Actions are public endpoints: anything can POST to them with any body.
// The services re-check ownership, so a bad id is not an authorization hole —
// but unvalidated input still reaches the data layer, and an empty string
// produces a confusing "not found" instead of a clear "bad request".
import { z } from "zod";
import { ValidationError } from "@/lib/errors";

// cuid()s are 25 chars; 40 leaves room without accepting an essay.
const IdSchema = z.string().trim().min(1).max(40);

/** Read a required row id, or throw ValidationError (400, an AppError). */
export function requireId(formData: FormData, key: string): string {
  const parsed = IdSchema.safeParse((formData.get(key) ?? "").toString());
  if (!parsed.success) {
    throw new ValidationError(`Missing or invalid ${key}.`);
  }
  return parsed.data;
}

/** Read a required integer field (e.g. a quantity), or throw ValidationError. */
export function requireInt(
  formData: FormData,
  key: string,
  opts: { min: number; max: number },
): number {
  const schema = z.coerce.number().int().min(opts.min).max(opts.max);
  const parsed = schema.safeParse((formData.get(key) ?? "").toString());
  if (!parsed.success) {
    throw new ValidationError(`Missing or invalid ${key}.`);
  }
  return parsed.data;
}
