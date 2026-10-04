// Pure helpers for the How many tab (FRONTEND_SPEC.md section 7.4).

import { int } from "@/lib/format";
import type { Q2Station } from "@/types/data";

/** Stations for the list: most trucks first, then the order they were picked. */
export function sortStations(stations: Q2Station[]): Q2Station[] {
  return [...stations].sort((a, b) => b.trucks - a.trucks || a.k - b.k);
}

/** Station dot diameters on this tab run from 11px (fewest trucks) to 19px (most). */
export const MIN_STATION_DIAMETER_PX = 11;
export const MAX_STATION_DIAMETER_PX = 19;

/** Dot radius in pixels for a station with `trucks`, scaled linearly between the fewest and the most. */
export function truckRadius(trucks: number, fewest: number, most: number): number {
  const share = most > fewest ? (Math.min(most, Math.max(fewest, trucks)) - fewest) / (most - fewest) : 0;
  return (MIN_STATION_DIAMETER_PX + share * (MAX_STATION_DIAMETER_PX - MIN_STATION_DIAMETER_PX)) / 2;
}

/** Radius per cand_id for a set of stations with truck counts. */
export function truckRadii(stations: { cand_id: number; trucks: number }[]): Map<number, number> {
  const counts = stations.map((station) => station.trucks);
  const fewest = Math.min(...counts);
  const most = Math.max(...counts);
  return new Map(stations.map((station) => [station.cand_id, truckRadius(station.trucks, fewest, most)]));
}

/** Extra tooltip line for a Q2 station: trucks, fires covered and the peak. */
export function stationLoadNote(station: Q2Station): string {
  const trucks = `${int(station.trucks)} ${station.trucks === 1 ? "truck" : "trucks"}`;
  const fires = `${int(station.fires_covered)} ${station.fires_covered === 1 ? "fire" : "fires"} covered`;
  return `${trucks} · ${fires} · up to ${int(station.peak_active)} at once`;
}
