// Pure helpers for the Gaps, Evidence and About tabs (FRONTEND_SPEC.md sections 7.6-7.8).
// Everything here only reads and words the exported numbers.

import { int, pct, points, signed } from "@/lib/format";
import type { BaselineLayout, EvidenceFile, GapsFile, Region } from "@/types/data";

/** The fire centre with the most unreachable fires. */
export function mostUnreachableRegion(gaps: GapsFile): Region {
  return gaps.by_region.reduce((most, row) => (row.unreachable_fires > most.unreachable_fires ? row : most)).region;
}

/** Straight-line reach in km at the threshold the unreachable fires are defined at. */
export function gapReachKm(gaps: GapsFile, fallbackKm: number): number {
  return gaps.thresholds.find((row) => row.threshold_min === gaps.threshold_min)?.reach_km ?? fallbackKm;
}

const BASELINE_ORDER: { layout: BaselineLayout; label: string; ours: boolean }[] = [
  { layout: "capped_pmedian", label: "Our layout", ours: true },
  { layout: "greedy_coverage", label: "Coverage-first layout", ours: true },
  { layout: "random_best", label: "Best of 1,000 random", ours: false },
  { layout: "random_median", label: "Typical random", ours: false },
  { layout: "most_populous_towns", label: "Biggest towns", ours: false },
];

export interface BaselineBar {
  label: string;
  /** Share of the reachable test-year ceiling. */
  value: number;
  /** True for our two layouts, false for the comparison baselines. */
  ours: boolean;
  /** Bar length as a share of the longest bar. */
  width: number;
}

/** The five baseline bars at K, in display order. Layouts missing from the file are skipped. */
export function baselineBars(evidence: EvidenceFile, k: number): BaselineBar[] {
  const rows = BASELINE_ORDER.flatMap((item) => {
    const row = evidence.baselines.find((baseline) => baseline.k === k && baseline.layout === item.layout);
    return row ? [{ label: item.label, value: row.test_relative, ours: item.ours }] : [];
  });
  const longest = Math.max(...rows.map((row) => row.value), 0);
  return rows.map((row) => ({ ...row, width: longest > 0 ? row.value / longest : 0 }));
}

/** "Ours beat 100% of 1,000 random layouts." for the capped p-median layout at K. */
export function beatsRandomLine(evidence: EvidenceFile, k: number): string | null {
  const ours = evidence.baselines.find((row) => row.k === k && row.layout === "capped_pmedian");
  if (!ours || ours.beats_random_coverage_share === null) return null;
  return `Ours beat ${pct(ours.beats_random_coverage_share, 0)} of 1,000 random layouts.`;
}

/** The note under the exact-check table about the exact p-median. */
export function pmedianNote(evidence: EvidenceFile): string {
  const { status, variables, note } = evidence.exact_check.pmedian;
  return status === "solved"
    ? `The exact p-median (${int(variables)} variables) was solved: ${note}.`
    : `The exact p-median could not be checked: with ${int(variables)} variables it is ${note}.`;
}

/** One line comparing the fair layout with the fastest-response one at the smallest K tested. */
export function fairnessLine(evidence: EvidenceFile): string | null {
  const k = Math.min(...evidence.fairness.map((row) => row.k));
  const fastest = evidence.fairness.find((row) => row.k === k && row.method === "capped_pmedian");
  const fair = evidence.fairness.find((row) => row.k === k && row.method === "fair");
  if (!fastest || !fair) return null;
  const cost = signed(100 * (fair.coverage - fastest.coverage), "pts") ?? "no change";
  return (
    `Fairness: at ${k} stations the fastest-response layout leaves ${fastest.lowest_region} at ` +
    `${pct(fastest.lowest_relative)} of its ceiling. Giving every fire centre a station first lifts the worst-off ` +
    `centre (${fair.lowest_region}) to ${pct(fair.lowest_relative)}, for ${cost} of overall coverage.`
  );
}

/** One line on how much the layout depends on weighting fires by size. */
export function weightLine(evidence: EvidenceFile): string {
  const { k, jaccard, coverage_weighted, coverage_unweighted } = evidence.weight_sensitivity;
  return (
    `Fire size: choosing ${k} stations with every fire counted equally changes many of the sites ` +
    `(overlap ${jaccard.toFixed(2)}) but barely moves coverage (${pct(coverage_weighted)} weighted, ` +
    `${pct(coverage_unweighted)} unweighted).`
  );
}

/** One line on whether the trucks were enough in the test year. */
export function overloadLine(evidence: EvidenceFile): string {
  const { overloaded_share, worst_station } = evidence.overload_2023;
  return (
    `Trucks: in ${evidence.split.test}, ${pct(overloaded_share)} of station-days had more fires than trucks; ` +
    `the worst station peaked at ${int(worst_station.peak_active)} fires against ${int(worst_station.trucks)} trucks.`
  );
}

/** A gap in percentage points for the exact-check table: "0.08 pts". */
export function gapPoints(value: number): string {
  return points(value);
}
