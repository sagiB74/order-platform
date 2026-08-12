// Money helpers. RULE: money is stored and passed around as an integer number
// of agorot/cents everywhere. We convert to/from a human "shekels" string ONLY
// at the edges — displaying to a person, or parsing what they typed.

/** 4500 -> "₪45.00" (Israeli shekel formatting). */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
  }).format(cents / 100);
}

/**
 * Parse a user-typed price in shekels ("45", "45.5", "₪45.00") into integer
 * agorot (4500). Returns null if it isn't a valid non-negative number, so the
 * caller can show a validation error instead of storing garbage.
 */
export function parseShekelsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[₪,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
