// Validation of the History date range. Shared by the route handlers and the tab's form, so the
// browser and the server apply the same rules.

/** The data covers the 2019-2023 fire seasons. */
export const HISTORY_MIN_DATE = "2019-05-01";
export const HISTORY_MAX_DATE = "2023-10-31";
/** Longest range allowed, counting both end dates: one May-October season. */
export const HISTORY_MAX_DAYS = 184;
export const HISTORY_DEFAULT_START = "2023-07-01";
export const HISTORY_DEFAULT_END = "2023-09-30";

export type RangeResult = { ok: true; start: string; end: string; days: number } | { ok: false; message: string };

const DAY_MS = 86_400_000;

/** Milliseconds for a real calendar date written YYYY-MM-DD, or null. */
function parseDate(text: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const time = Date.parse(`${text}T00:00:00Z`);
  // Date.parse accepts 2023-02-30 and rolls it over; reject anything that does not round-trip.
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== text) return null;
  return time;
}

/** Checks a start and end date. Both are inclusive. */
export function validateRange(start: string | null | undefined, end: string | null | undefined): RangeResult {
  if (!start || !end) return { ok: false, message: "Give both start and end as YYYY-MM-DD." };
  const startTime = parseDate(start);
  const endTime = parseDate(end);
  if (startTime === null || endTime === null) {
    return { ok: false, message: "Dates must be real calendar dates written YYYY-MM-DD." };
  }
  if (start < HISTORY_MIN_DATE || end > HISTORY_MAX_DATE) {
    return { ok: false, message: `Dates must be between ${HISTORY_MIN_DATE} and ${HISTORY_MAX_DATE}.` };
  }
  if (startTime > endTime) return { ok: false, message: "The start date must not be after the end date." };
  const days = Math.round((endTime - startTime) / DAY_MS) + 1;
  if (days > HISTORY_MAX_DAYS) {
    return { ok: false, message: `The range can be at most ${HISTORY_MAX_DAYS} days; this one is ${days}.` };
  }
  return { ok: true, start, end, days };
}

/** Every date from start to end, inclusive, as YYYY-MM-DD. */
export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let time = Date.parse(`${start}T00:00:00Z`); time <= Date.parse(`${end}T00:00:00Z`); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}
