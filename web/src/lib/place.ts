// Pure helpers for the Place stations tab (FRONTEND_SPEC.md section 7.2).

import { pct } from "@/lib/format";
import type { Q1VariantId } from "@/lib/state";
import type { EvidenceFile, Q1File } from "@/types/data";

/** The optimized Q1 layout: the first K picks of the variant, in pick order. */
export function q1Layout(q1: Q1File, variant: Q1VariantId, k: number): number[] {
  return q1.variants[variant].picks.slice(0, k);
}

/** The smallest K a variant's curve has (1 for capped p-median, 6 for fair). */
export function minCurveK(q1: Q1File, variant: Q1VariantId): number {
  return Math.min(...q1.variants[variant].curve.map((point) => point.k));
}

/**
 * The validation line under the stat cards. The train/test evidence exists only for the capped
 * p-median layout at K = 10, 20, 40 and 60.
 */
export function validationText(evidence: EvidenceFile, variant: Q1VariantId, k: number): string {
  const tested = evidence.q1_variants.filter((row) => row.variant === "capped_pmedian");
  const row = variant === "capped_pmedian" ? tested.find((item) => item.k === k) : undefined;
  if (row) {
    const [first, last] = [evidence.split.train[0], evidence.split.train[evidence.split.train.length - 1]];
    return (
      `Chosen on ${first}–${last} fires, this layout reached ${pct(row.test_relative)} ` +
      `of the ${evidence.split.test} ceiling.`
    );
  }
  const ks = tested.map((item) => item.k).sort((a, b) => a - b);
  const list = ks.length > 1 ? `${ks.slice(0, -1).join(", ")} and ${ks[ks.length - 1]}` : ks.join("");
  return `Tested on unseen ${evidence.split.test} fires at K = ${list} (see About).`;
}
