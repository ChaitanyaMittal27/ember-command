// Pure helpers for the Existing halls tab (FRONTEND_SPEC.md section 7.5).

import { int, pct, signed } from "@/lib/format";
import { stationTooltip } from "@/lib/mapView";
import type { HallTruckMode } from "@/lib/state";
import type { Candidate, EvidenceFile, Meta, Q3File, Q3Hall } from "@/types/data";

/** A hall's trucks in the chosen mode: what its load needs, or its share of two per hall. */
export function hallTrucks(hall: Q3Hall, mode: HallTruckMode): number {
  return mode === "need" ? hall.trucks_need : hall.trucks_2x;
}

/** Total trucks in the chosen mode, from the file's own totals. */
export function hallTruckTotal(q3: Q3File, mode: HallTruckMode): number {
  return mode === "need" ? q3.trucks.need_total : q3.trucks.budget_2x;
}

/** Halls that cover no fire within the threshold. */
export function hallsCoveringNoFire(q3: Q3File): number {
  return q3.halls.filter((hall) => hall.fires_covered === 0).length;
}

/** Hall squares on the map run from 8px (fewest trucks) to 16px (most). */
export const MIN_HALL_SIZE_PX = 8;
export const MAX_HALL_SIZE_PX = 16;

/** Side of a hall's square in pixels, scaled linearly between the fewest and the most trucks. */
export function hallSize(trucks: number, fewest: number, most: number): number {
  const share = most > fewest ? (Math.min(most, Math.max(fewest, trucks)) - fewest) / (most - fewest) : 0;
  return MIN_HALL_SIZE_PX + share * (MAX_HALL_SIZE_PX - MIN_HALL_SIZE_PX);
}

/** A gain stored as a fraction (0.0138), shown in percentage points: "+1.38 pts". */
export function gainText(gain: number): string {
  return signed(100 * gain, "pts", 2) ?? "+0.00 pts";
}

/** A site drawn on the map with its hover text. */
export interface SiteMarker {
  candidate: Candidate;
  tooltip: string;
}
export interface HallMarker extends SiteMarker {
  /** Side of the square in pixels. */
  size: number;
}
export interface NextMarker extends SiteMarker {
  rank: number;
}

/** The halls to draw, sized by trucks in the chosen mode. */
export function hallMarkers(q3: Q3File, candidatesById: Map<number, Candidate>, mode: HallTruckMode): HallMarker[] {
  const counts = q3.halls.map((hall) => hallTrucks(hall, mode));
  const fewest = Math.min(...counts);
  const most = Math.max(...counts);
  return q3.halls.flatMap((hall) => {
    const candidate = candidatesById.get(hall.cand_id);
    if (!candidate) return [];
    const trucks = hallTrucks(hall, mode);
    const note =
      `${int(trucks)} ${trucks === 1 ? "truck" : "trucks"} (${mode === "need" ? "by load" : "from 2 per hall"}) · ` +
      `${int(hall.fires_covered)} ${hall.fires_covered === 1 ? "fire" : "fires"} covered`;
    return [{ candidate, size: hallSize(trucks, fewest, most), tooltip: stationTooltip(candidate, note) }];
  });
}

/** The next stations to add to the halls, in rank order. */
export function nextMarkers(q3: Q3File, candidatesById: Map<number, Candidate>): NextMarker[] {
  return q3.next_stations.flatMap((next) => {
    const candidate = candidatesById.get(next.cand_id);
    if (!candidate) return [];
    const note = `Next station ${next.rank} of ${q3.next_stations.length} · ${gainText(next.gain)}`;
    return [{ candidate, rank: next.rank, tooltip: stationTooltip(candidate, note) }];
  });
}

/** The two sentences of the headline card. Null if no optimized layout matches the halls. */
export function matchingHeadline(q3: Q3File, meta: Meta, evidence: EvidenceFile) {
  if (!q3.matching) return null;
  const years = meta.data.years;
  const train = evidence.split.train;
  return {
    k: q3.matching.k,
    halls: q3.halls.length,
    detail:
      `Over ${years[0]}–${years[years.length - 1]}. Fitted on ${train[0]}–${train[train.length - 1]} only, ` +
      `the dense hall network held up better on ${evidence.split.test} ` +
      `(${pct(evidence.q3_split.halls_test)} vs ${pct(evidence.q3_split.optimized_test)}) because the fires moved north.`,
  };
}
