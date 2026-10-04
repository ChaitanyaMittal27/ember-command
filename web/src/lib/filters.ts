// Options for the two header selects. Filters only change what the map draws.

import { REGIONS, type Region } from "@/types/data";

export const FIRE_YEARS = [2019, 2020, 2021, 2022, 2023] as const;

export type YearFilter = "all" | (typeof FIRE_YEARS)[number];
export type RegionFilter = "all" | Region;

export const YEAR_OPTIONS: { value: YearFilter; label: string }[] = [
  { value: "all", label: "All years" },
  ...FIRE_YEARS.map((year) => ({ value: year, label: String(year) })),
];

export const REGION_OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: "all", label: "All of BC" },
  ...REGIONS.map((region) => ({ value: region, label: region })),
];
