// Shared logic of the /api/history route handlers, and the shapes they return.
// Server-side: imports the database module.

import { isDatabaseConfigured, queryRows } from "@/lib/db";
import { validateRange } from "@/lib/historyParams";
import { HISTORY_QUERIES, type HistoryQueryName } from "@/lib/historyQueries";
import type { CellRow, DailyRow, IgnitionRow } from "@/lib/historyTypes";
import type { Region } from "@/types/data";

// node-postgres returns bigint and numeric as strings, and timestamps as Date objects.
type Raw = Record<string, unknown>;
const text = (value: unknown) => String(value);
const number = (value: unknown) => Number(value);
const isoDay = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10));
const isoTime = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value));

export const ROW_MAPPERS = {
  daily: (row: Raw): DailyRow => ({
    day: isoDay(row.day),
    region: text(row.region) as Region,
    detections: number(row.detections),
    frp_sum: number(row.frp_sum),
  }),
  cells: (row: Raw): CellRow => ({
    cell_id: text(row.cell_id),
    detections: number(row.detections),
    frp_sum: number(row.frp_sum),
    lat: number(row.lat),
    lon: number(row.lon),
  }),
  ignitions: (row: Raw): IgnitionRow => ({
    fire_id: text(row.fire_id),
    year: number(row.year),
    ignition_time_utc: isoTime(row.ignition_time_utc),
    lat: number(row.lat),
    lon: number(row.lon),
    weight: number(row.weight),
    active_days_capped: number(row.active_days_capped),
    region: text(row.region) as Region,
  }),
} as const;

function error(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Handles GET /api/history/<name>?start=YYYY-MM-DD&end=YYYY-MM-DD.
 * 400 for a bad range, 503 when no database is configured, 500 (with a generic message) if the
 * query fails. The raw database error is never sent to the browser.
 */
export async function historyResponse(request: Request, name: HistoryQueryName): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const range = validateRange(params.get("start"), params.get("end"));
  if (!range.ok) return error(400, range.message);
  if (!isDatabaseConfigured()) return error(503, "The history database is not configured.");
  try {
    const rows = await queryRows<Raw>(HISTORY_QUERIES[name], [range.start, range.end]);
    const mapper = ROW_MAPPERS[name] as (row: Raw) => unknown;
    return Response.json({ start: range.start, end: range.end, rows: rows.map(mapper) });
  } catch (cause) {
    // Log only the error's type and code: its message can name the host or the user.
    const code = (cause as { code?: unknown } | null)?.code;
    console.error(`history query "${name}" failed:`, cause instanceof Error ? cause.name : "error", code ?? "");
    return error(500, "The history database could not be reached. Try again later.");
  }
}
