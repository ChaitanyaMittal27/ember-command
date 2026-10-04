// Pure helpers for the History tab: shaping the API rows for the chart and the map.

import { daysBetween } from "@/lib/historyParams";
import type { CellRow, DailyRow } from "@/lib/historyTypes";
import { REGIONS, type Region } from "@/types/data";

/** One chart row per day: the detections in each fire centre (0 where the database has no row). */
export type DailySeriesRow = { day: string } & Record<Region, number>;

export function dailySeries(rows: DailyRow[], start: string, end: string): DailySeriesRow[] {
  const byDay = new Map<string, DailySeriesRow>();
  for (const day of daysBetween(start, end)) {
    byDay.set(day, { day, ...(Object.fromEntries(REGIONS.map((region) => [region, 0])) as Record<Region, number>) });
  }
  for (const row of rows) {
    const entry = byDay.get(row.day);
    if (entry && row.region in entry) entry[row.region] += row.detections;
  }
  return [...byDay.values()];
}

/** Detections per fire centre over the whole range. */
export function regionTotals(rows: DailyRow[]): Record<Region, number> {
  const totals = Object.fromEntries(REGIONS.map((region) => [region, 0])) as Record<Region, number>;
  for (const row of rows) if (row.region in totals) totals[row.region] += row.detections;
  return totals;
}

export function totalDetections(rows: DailyRow[]): number {
  return rows.reduce((total, row) => total + row.detections, 0);
}

/** Heat dots run from 1.5px for a single detection up to 16px for the busiest cell. */
export const MIN_CELL_RADIUS_PX = 1.5;
export const MAX_CELL_RADIUS_PX = 16;

/** Radius of a cell's dot: grows with the square root of its detections, so area tracks the count. */
export function cellRadius(detections: number, busiest: number): number {
  if (busiest <= 0 || detections <= 0) return MIN_CELL_RADIUS_PX;
  const share = Math.sqrt(Math.min(detections, busiest) / busiest);
  return MIN_CELL_RADIUS_PX + share * (MAX_CELL_RADIUS_PX - MIN_CELL_RADIUS_PX);
}

export function busiestCell(cells: CellRow[]): number {
  return cells.reduce((most, cell) => Math.max(most, cell.detections), 0);
}

/** Hover text for a heat cell. */
export function cellTooltip(cell: CellRow): string {
  const count = cell.detections.toLocaleString("en-US");
  return [`${count} satellite ${cell.detections === 1 ? "detection" : "detections"}`, `Cell ${cell.cell_id} (0.1° square)`].join("\n");
}

/** Chart colour token (--color-series-N) for each fire centre. Fixed, so a region keeps its colour. */
export const REGION_SERIES: Record<Region, 1 | 2 | 3 | 4 | 5 | 6> = {
  Cariboo: 1,
  Coastal: 2,
  Kamloops: 3,
  Northwest: 4,
  "Prince George": 5,
  Southeast: 6,
};

/** Detections per fire centre, largest first, with each centre's share of the total. */
export function sortedRegionTotals(totals: Record<Region, number>): { region: Region; detections: number; share: number }[] {
  const all = REGIONS.reduce((sum, region) => sum + totals[region], 0);
  return REGIONS.map((region) => ({ region, detections: totals[region], share: all > 0 ? totals[region] / all : 0 })).sort(
    (a, b) => b.detections - a.detections || a.region.localeCompare(b.region),
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A short axis label for a YYYY-MM-DD day: "Jul 1". No Date object, so no time-zone shift. */
export function dayLabel(day: string): string {
  const [, month, date] = day.split("-").map(Number);
  return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${date}` : day;
}

/** About `count` evenly spaced days from a series, always including the first and the last. */
export function axisDays(days: string[], count = 7): string[] {
  if (days.length <= count) return days;
  const step = (days.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => days[Math.round(index * step)]);
}
