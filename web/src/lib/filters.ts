// Options for the two header selects. Filters only change what the map draws.

import { REGIONS, type Region } from "@/types/data";

export type YearFilter = "all" | number;
export type RegionFilter = "all" | Region;

/** "All years" plus one option per year in the data (meta.data.years). */
export function yearOptions(years: number[]): { value: YearFilter; label: string }[] {
  return [{ value: "all", label: "All years" }, ...years.map((year) => ({ value: year, label: String(year) }))];
}

export const REGION_OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: "all", label: "All of BC" },
  ...REGIONS.map((region) => ({ value: region, label: region })),
];
