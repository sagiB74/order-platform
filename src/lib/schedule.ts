// Small date helpers for the owner's schedule. No date library — just enough to
// build a 5-day window and a month grid, bucket orders by day, and format nicely.
//
// NOTE on timezones: for now we use the SERVER's local time for day boundaries
// and formatting. Good enough for a single-region MVP; when we go multi-region
// we'll format in each business's `timezone` (already stored on Business).

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** Local calendar-day key, e.g. "2026-08-08" — used to bucket orders by day. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Fri, Aug 8" */
export function formatDayHeading(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** "14:30" */
export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** "אוגוסט 2026" — dashboard is Hebrew, so this is locked to he-IL rather than the
 *  server's locale (which would render English month names). */
export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

/** "אוג׳" — short month name for chart axis ticks. */
export function formatMonthShort(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("he-IL", { month: "short" }).format(new Date(year, monthIndex, 1));
}

export type MonthRange = { start: Date; end: Date };

/**
 * Exact calendar-month bounds: [1st 00:00, 1st-of-next-month 00:00). Unlike
 * monthWindow() (a padded 6-week UI grid that spills into neighboring months),
 * this is the precise range to use when aggregating "everything in month X" —
 * e.g. stats. Relies on Date's built-in month overflow, so year rollover and
 * variable month lengths (leap Feb, 30 vs 31 days) are handled for free.
 */
export function monthRange(year: number, monthIndex: number): MonthRange {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  };
}

/** {year, monthIndex} shifted by n months (n may be negative). Same overflow trick. */
export function addMonths(
  year: number,
  monthIndex: number,
  n: number,
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + n, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

/**
 * `count` consecutive months ENDING at (year, monthIndex), oldest first. Used
 * to build the stats page's trailing revenue chart window.
 */
export function lastMonths(
  endYear: number,
  endMonthIndex: number,
  count: number,
): { year: number; monthIndex: number }[] {
  const months: { year: number; monthIndex: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(addMonths(endYear, endMonthIndex, -i));
  }
  return months;
}

export type FiveDayWindow = {
  kind: "5day";
  days: Date[]; // 5 consecutive startOfDay dates, today first
  rangeStart: Date;
  rangeEnd: Date; // exclusive
};

export function fiveDayWindow(now = new Date()): FiveDayWindow {
  const start = startOfDay(now);
  const days = [0, 1, 2, 3, 4].map((n) => addDays(start, n));
  return { kind: "5day", days, rangeStart: start, rangeEnd: addDays(start, 5) };
}

export type WeekWindow = {
  kind: "week";
  days: Date[]; // 7 consecutive startOfDay dates, today first
  rangeStart: Date;
  rangeEnd: Date; // exclusive
};

/** The next 7 days (today through +6), for the "שבוע קרוב" view. */
export function weekWindow(now = new Date()): WeekWindow {
  const start = startOfDay(now);
  const days = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(start, n));
  return { kind: "week", days, rangeStart: start, rangeEnd: addDays(start, 7) };
}

export type MonthWindow = {
  kind: "month";
  year: number;
  monthIndex: number; // 0-11
  weeks: Date[][]; // 6 rows × 7 days, includes spillover from adjacent months
  rangeStart: Date; // first cell (a Sunday)
  rangeEnd: Date; // exclusive, after the last cell
};

/**
 * Build a 6×7 calendar grid for the given month. The grid starts on the Sunday
 * on/before the 1st and always has 6 weeks, so the layout never jumps around.
 */
export function monthWindow(year: number, monthIndex: number): MonthWindow {
  const first = new Date(year, monthIndex, 1);
  const gridStart = addDays(first, -first.getDay()); // back up to Sunday
  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return { kind: "month", year, monthIndex, weeks, rangeStart: gridStart, rangeEnd: cursor };
}

/** Parse a "YYYY-MM" query param into {year, monthIndex}, or fall back to now. */
export function parseMonthParam(param: string | undefined, now = new Date()) {
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) return { year, monthIndex };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

/** "YYYY-MM" string for building prev/next month links. */
export function monthParam(year: number, monthIndex: number): string {
  return `${year}-${pad(monthIndex + 1)}`;
}
