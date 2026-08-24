// Edge validation for the public checkout payload. The important test here is
// the smuggling one: a client can put anything in a form post, so we pin down
// that extra fields are dropped rather than trusted.
import { describe, it, expect } from "vitest";
import {
  PublicCheckoutInput,
  resolvePickupAt,
  MAX_LINE_QUANTITY,
} from "@/modules/storefront/checkout-input";

const valid = {
  customerName: "שגיא",
  customerPhone: "050-123-4567",
  pickupDate: "2026-09-01",
  pickupTime: "10:30",
  items: [{ productId: "p1", quantity: 2 }],
};

describe("PublicCheckoutInput — you cannot smuggle a price or a tenant", () => {
  it("DROPS priceCents, businessId, status and total", () => {
    const parsed = PublicCheckoutInput.parse({
      ...valid,
      priceCents: 1,
      businessId: "someone-elses-business",
      status: "OPEN", // would skip the approval queue
      total: 0,
    });

    expect(parsed).not.toHaveProperty("priceCents");
    expect(parsed).not.toHaveProperty("businessId");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("total");
    // What survives is only ever the customer's own details + productIds/quantities.
    expect(Object.keys(parsed).sort()).toEqual(
      ["customerName", "customerPhone", "items", "pickupDate", "pickupTime"].sort(),
    );
  });

  it("DROPS a price hidden inside an item line", () => {
    const parsed = PublicCheckoutInput.parse({
      ...valid,
      items: [{ productId: "p1", quantity: 1, priceCents: 1 }],
    });
    expect(parsed.items[0]).toEqual({ productId: "p1", quantity: 1 });
  });

  it("accepts a well-formed payload", () => {
    expect(PublicCheckoutInput.safeParse(valid).success).toBe(true);
  });
});

describe("PublicCheckoutInput — field rules", () => {
  const reject = (over: Record<string, unknown>) =>
    expect(PublicCheckoutInput.safeParse({ ...valid, ...over }).success).toBe(false);

  it("rejects an empty cart", () => reject({ items: [] }));
  it("rejects zero quantity", () => reject({ items: [{ productId: "p1", quantity: 0 }] }));
  it("rejects negative quantity", () => reject({ items: [{ productId: "p1", quantity: -1 }] }));
  it("rejects fractional quantity", () => reject({ items: [{ productId: "p1", quantity: 1.5 }] }));
  it("rejects a quantity over the cap", () =>
    reject({ items: [{ productId: "p1", quantity: MAX_LINE_QUANTITY + 1 }] }));
  it("rejects too many distinct lines", () =>
    reject({ items: Array.from({ length: 41 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })) }));
  it("rejects a one-character name", () => reject({ customerName: "א" }));
  it("rejects a phone with too few digits", () => reject({ customerPhone: "0501" }));
  it("rejects a malformed date", () => reject({ pickupDate: "01/09/2026" }));
  it("rejects a malformed time", () => reject({ pickupTime: "10:30:00" }));
  it("rejects notes over 500 characters", () => reject({ notes: "x".repeat(501) }));
});

describe("resolvePickupAt", () => {
  const NOW = new Date(2026, 7, 24, 12, 0, 0); // 24 Aug 2026, local

  it("combines date + time into a Date", () => {
    const r = resolvePickupAt("2026-08-25", "10:30", NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pickupAt.getFullYear()).toBe(2026);
      expect(r.pickupAt.getMonth()).toBe(7);
      expect(r.pickupAt.getDate()).toBe(25);
      expect(r.pickupAt.getHours()).toBe(10);
      expect(r.pickupAt.getMinutes()).toBe(30);
    }
  });

  it("rejects a pickup in the past", () => {
    expect(resolvePickupAt("2026-08-23", "10:00", NOW).ok).toBe(false);
  });

  it("rejects a pickup earlier today", () => {
    expect(resolvePickupAt("2026-08-24", "09:00", NOW).ok).toBe(false);
  });

  it("accepts a pickup later today", () => {
    expect(resolvePickupAt("2026-08-24", "18:00", NOW).ok).toBe(true);
  });

  it("rejects a pickup beyond the 90-day horizon", () => {
    expect(resolvePickupAt("2027-08-24", "10:00", NOW).ok).toBe(false);
  });

  it("rejects a date that doesn't exist rather than rolling it over", () => {
    // new Date(2027, 1, 31) silently becomes 3 March. Booking a different day
    // than the customer picked would be worse than refusing.
    expect(resolvePickupAt("2026-09-31", "10:00", NOW).ok).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(resolvePickupAt("not-a-date", "10:00", NOW).ok).toBe(false);
    expect(resolvePickupAt("2026-09-01", "xx:yy", NOW).ok).toBe(false);
  });
});
