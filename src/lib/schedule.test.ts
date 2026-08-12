// Pure boundary-case tests for the month helpers. No DB — these exist because a
// wrong bound here silently corrupts every stats number downstream (revenue
// leaking into the wrong month, a chart month landing in the wrong year, etc).
import { describe, expect, it } from "vitest";
import { addMonths, lastMonths, monthRange } from "./schedule";

describe("monthRange", () => {
  it("rolls over into January of next year at December", () => {
    const { end } = monthRange(2026, 11); // December (0-indexed)
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(1);
  });

  it("handles a leap February correctly (29 days)", () => {
    const { end } = monthRange(2024, 1); // February 2024 is a leap year
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(1);
  });

  it("returns [1st, next-1st) as exact midnight bounds", () => {
    const { start, end } = monthRange(2026, 7); // August
    expect(start).toEqual(new Date(2026, 7, 1));
    expect(end).toEqual(new Date(2026, 8, 1));
  });
});

describe("addMonths", () => {
  it("rolls backward across a year boundary", () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });

  it("rolls forward across a year boundary", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
  });

  it("is a no-op for n=0", () => {
    expect(addMonths(2026, 4, 0)).toEqual({ year: 2026, monthIndex: 4 });
  });
});

describe("lastMonths", () => {
  it("returns `count` months oldest-first, ending at the given month", () => {
    const months = lastMonths(2026, 1, 12); // ending Feb 2026
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2025, monthIndex: 2 }); // Mar 2025
    expect(months.at(-1)).toEqual({ year: 2026, monthIndex: 1 }); // Feb 2026
  });

  it("stays within a single year when the window doesn't cross one", () => {
    const months = lastMonths(2026, 5, 3); // Apr, May, Jun 2026
    expect(months).toEqual([
      { year: 2026, monthIndex: 3 },
      { year: 2026, monthIndex: 4 },
      { year: 2026, monthIndex: 5 },
    ]);
  });
});
