// Formatting helpers (FRONTEND_SPEC.md section 4). Stored shares are fractions 0-1.

import type { Candidate } from "@/types/data";

const DASH = "—";

function missing(x: number | null | undefined): x is null | undefined {
  return x === null || x === undefined || !Number.isFinite(x);
}

/** A share as a percentage: 0.377 -> "37.7%". */
export function pct(x: number | null | undefined, digits = 1): string {
  return missing(x) ? DASH : `${(100 * x).toFixed(digits)}%`;
}

/** Minutes: 114.3 -> "114 min" (0 decimals in cards, 1 in tables). */
export function mins(x: number | null | undefined, digits = 0): string {
  return missing(x) ? DASH : `${x.toFixed(digits)} min`;
}

/** A whole number with thousands separators: 7032 -> "7,032". */
export function int(x: number | null | undefined): string {
  return missing(x) ? DASH : Math.round(x).toLocaleString("en-US");
}

/** A value already in percentage points (evidence gap_points): 0.08 -> "0.08 pts". */
export function points(x: number | null | undefined, digits = 2): string {
  return missing(x) ? DASH : `${x.toFixed(digits)} pts`;
}

/** Display name for a candidate site. */
export function siteName(candidate: Pick<Candidate, "name" | "kind">): string {
  return candidate.name ?? (candidate.kind === "hall" ? "Unnamed fire hall" : "Unnamed place");
}
