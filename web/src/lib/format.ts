// Formatting helpers (FRONTEND_SPEC.md section 4). Stored shares are fractions 0-1.

import type { Candidate } from "@/types/data";

const DASH = "—";
const MINUS = "−";

function missing(x: number | null | undefined): x is null | undefined {
  return x === null || x === undefined || !Number.isFinite(x);
}

/**
 * `x * scale` rounded to `digits` decimals, half away from zero, as a string.
 * `toFixed` alone rounds 44.15 down to "44.1" because 44.15 is stored as 44.1499999...; rounding the
 * scaled integer first (with a tiny nudge for products that land just under a half) avoids that.
 */
function roundFixed(x: number, digits: number, scale = 1): string {
  const factor = 10 ** digits;
  const scaled = Math.abs(x) * scale * factor;
  const rounded = Math.round(scaled * (1 + 4 * Number.EPSILON) + Number.EPSILON) / factor;
  return (Math.sign(x) * rounded || 0).toFixed(digits);
}

/** A share as a percentage: 0.377 -> "37.7%"; halves round up (0.4415 -> "44.2%"). */
export function pct(x: number | null | undefined, digits = 1): string {
  return missing(x) ? DASH : `${roundFixed(x, digits, 100)}%`;
}

/** Minutes: 114.3 -> "114 min" (0 decimals in cards, 1 in tables). */
export function mins(x: number | null | undefined, digits = 0): string {
  return missing(x) ? DASH : `${roundFixed(x, digits)} min`;
}

/** A whole number with thousands separators: 7032 -> "7,032". */
export function int(x: number | null | undefined): string {
  return missing(x) ? DASH : Math.round(x).toLocaleString("en-US");
}

/** A value already in percentage points (evidence gap_points): 0.08 -> "0.08 pts". */
export function points(x: number | null | undefined, digits = 2): string {
  return missing(x) ? DASH : `${roundFixed(x, digits)} pts`;
}

/**
 * A signed change for display, e.g. "+1.2 pts" or "−0.8 pts", or null when it rounds to zero.
 * `value` is already in the display unit (percentage points or minutes).
 */
export function signed(value: number, unit: string, digits = 1): string | null {
  const text = roundFixed(Math.abs(value), digits);
  if (Number(text) === 0) return null;
  return `${value > 0 ? "+" : MINUS}${text} ${unit}`;
}

/** Display name for a candidate site. */
export function siteName(candidate: Pick<Candidate, "name" | "kind">): string {
  return candidate.name ?? (candidate.kind === "hall" ? "Unnamed fire hall" : "Unnamed place");
}
