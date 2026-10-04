// Types for web/public/data/*.json. Mirrors notebooks/data-contract.md (schema_version 1).
// Change the contract first, then this file and the export notebook together.

export const SCHEMA_VERSION = 1;

export type Region =
  | "Cariboo"
  | "Coastal"
  | "Kamloops"
  | "Northwest"
  | "Prince George"
  | "Southeast";

export const REGIONS: Region[] = ["Cariboo", "Coastal", "Kamloops", "Northwest", "Prince George", "Southeast"];

/** "YYYY-MM-DD" (UTC). */
export type DateString = string;
/** "YYYY-MM-DDTHH:MM:SSZ" (UTC). */
export type Timestamp = string;
/** Fraction 0-1. */
export type Share = number;

interface Versioned {
  schema_version: 1;
  generated_at: Timestamp;
}

export interface RegionScore {
  coverage: Share;
  relative: Share; // vs that region's own ceiling
}

// ---------- meta.json
export interface Meta extends Versioned {
  data: {
    firms_product: string;
    years: number[];
    train_years: number[];
    test_year: number;
    osm_query_date: DateString;
    weather_used: boolean;
  };
  settings: {
    threshold_min: number;
    detour: number;
    speed_kmh: number;
    dispatch_min: number;
    earth_radius_km: number;
    reach_km: number;
    cap_min: number;
    truck_percentile: number;
    truck_busy_days_only: boolean;
    weight_cap: number;
    link_km: number;
    link_days: number;
  };
  regions: Region[];
  counts: {
    fires: number;
    fires_by_year: Record<string, number>;
    static_fires_excluded: number;
    candidates: number;
    halls: number;
    towns: number;
  };
  ceiling: {
    all_years: Share;
    train: Share;
    test: Share;
    by_region: Record<Region, Share>;
  };
}

// ---------- candidates.json
export interface Candidate {
  cand_id: number; // == array index
  name: string | null;
  kind: "hall" | "town";
  region: Region;
  lat: number;
  lon: number;
  population: number | null;
}
export interface CandidatesFile extends Versioned {
  candidates: Candidate[];
}

// ---------- fires.json
export interface Fire {
  fire_id: string;
  year: number;
  date: DateString;
  lat: number;
  lon: number;
  weight: number; // 1-16
  active_days: number; // 1-14
  region: Region;
  nearest_min: number; // to nearest of all candidates
  reachable: boolean; // nearest_min <= threshold_min
}
export interface FiresFile extends Versioned {
  fires: Fire[];
}

// ---------- static_fires.json
export interface StaticFire {
  fire_id: string;
  year: number;
  lat: number;
  lon: number;
}
export interface StaticFiresFile extends Versioned {
  fires: StaticFire[];
}

// ---------- q1_layouts.json
// Curves: look entries up by `k`, never by array index (the fair curve starts at K = 6).
export interface CurvePoint {
  k: number;
  site: number; // cand_id added at this K
  coverage: Share;
  relative: Share;
  mean_min: number;
}
export interface Q1CurvePoint extends CurvePoint {
  by_region: Record<Region, RegionScore>;
}
export interface Q1Variant {
  label: string;
  picks: number[]; // picks[i] added at K = i + 1
  curve: Q1CurvePoint[]; // capped_pmedian: K = 1-60 (60 entries); fair: K = 6-60 (55 entries)
  seeds?: number[]; // fair variant only; == picks.slice(0, 6)
}
export interface Q1File extends Versioned {
  fitted_on: number[];
  k_max: number;
  default_variant: "capped_pmedian";
  variants: {
    capped_pmedian: Q1Variant;
    fair: Q1Variant;
  };
}

// ---------- q2_coverage.json
export interface Q2Station {
  cand_id: number;
  k: number;
  trucks: number;
  fires_covered: number;
  peak_active: number;
}
export interface Q2File extends Versioned {
  fitted_on: number[];
  method: "greedy_coverage";
  k_max: number;
  target_relative: Share;
  k_star: number | null;
  elbow_k: number; // elbow of the curve over elbow_range
  elbow_range: [number, number]; // [1, 60]
  picks: number[];
  curve: CurvePoint[];
  stations: Q2Station[]; // the k_star layout, in pick order; [] when k_star is null
  total_trucks: number | null; // null when k_star is null
  by_region_at_k_star: Record<Region, RegionScore & { stations: number; trucks: number }> | null; // null when k_star is null
}

// ---------- q3_halls.json
export interface Q3Hall {
  cand_id: number; // 0-520
  fires_covered: number;
  trucks_need: number;
  trucks_2x: number; // allocated with load = trucks_need if fires_covered > 0, else 0
}
export interface Q3File extends Versioned {
  fitted_on: number[];
  score: {
    coverage: Share;
    relative: Share;
    mean_min: number;
    by_region: Record<Region, RegionScore & { halls: number }>;
  };
  trucks: { need_total: number; budget_2x: number };
  halls: Q3Hall[];
  /** null if no K on the q2 curve reaches the halls' coverage. */
  matching: { k: number; coverage: Share; relative: Share; mean_min: number; note: string } | null;
  next_stations: { rank: number; cand_id: number; coverage_after: Share; gain: Share }[];
}

// ---------- gaps.json
export interface GapsFile extends Versioned {
  threshold_min: number;
  overall: { fires: number; unreachable_fires: number; unreachable_weight_share: Share };
  by_region: { region: Region; fires: number; unreachable_fires: number; unreachable_weight_share: Share }[];
  thresholds: { threshold_min: number; reach_km: number; ceiling: Share }[];
}

// ---------- evidence.json
export type BaselineLayout =
  | "capped_pmedian"
  | "greedy_coverage"
  | "most_populous_towns"
  | "random_median"
  | "random_best";

export interface EvidenceFile extends Versioned {
  split: { train: number[]; test: number };
  q1_variants: {
    variant: "capped_pmedian" | "uncapped_pmedian";
    k: number;
    train_coverage: Share;
    train_relative: Share;
    test_coverage: Share;
    test_relative: Share;
  }[];
  baselines: {
    k: number;
    layout: BaselineLayout;
    test_relative: Share;
    test_mean_min: number;
    beats_random_coverage_share: Share | null;
    beats_random_minutes_share: Share | null;
  }[];
  loyo: {
    k: number;
    folds: { held_out_year: number; coverage: Share; ceiling: Share; relative: Share }[];
    mean_jaccard: number;
    region_stability: { region: Region; per_fold: number[]; mean: number; std: number }[];
  };
  exact_check: {
    /** gap_points is in percentage points (0.08 = 0.08 points), not a fraction. */
    coverage: { k: number; greedy: Share; exact: Share; gap_points: number }[];
    pmedian: { status: "timed_out" | "solved"; variables: number; note: string };
  };
  fairness: {
    k: number;
    method: "capped_pmedian" | "fair";
    coverage: Share;
    lowest_region: Region;
    lowest_relative: Share;
  }[];
  weight_sensitivity: { k: number; jaccard: number; coverage_weighted: Share; coverage_unweighted: Share };
  overload_2023: {
    k_star_train: number;
    total_trucks_train: number;
    overloaded_share: Share;
    stations_ever_overloaded: number;
    worst_day_overloaded: number;
    worst_station: { cand_id: number; trucks: number; peak_active: number; overloaded_days: number };
  };
  q3_split: {
    halls_train: Share;
    halls_test: Share;
    k_match_train: number;
    optimized_train: Share;
    optimized_test: Share;
  };
}

// ---------- scoring (must match the notebook; see contract section 2)
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number, R: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function travelMinutes(fire: Fire, site: Candidate, s: Meta["settings"]): number {
  return (haversineKm(fire.lat, fire.lon, site.lat, site.lon, s.earth_radius_km) * s.detour) / s.speed_kmh * 60
    + s.dispatch_min;
}

/**
 * Score an open set of candidates over the given fires. `ceiling` comes from meta.json.
 * Must not be called with an empty layout: with no open site every travel time is infinite.
 */
export function scoreLayout(
  fires: Fire[],
  open: Candidate[],
  s: Meta["settings"],
  ceiling: Share,
): { coverage: Share; relative: Share; mean_min: number } {
  if (open.length === 0) throw new Error("scoreLayout: the layout is empty; open at least one site");
  let total = 0, covered = 0, weightedMin = 0;
  for (const f of fires) {
    let best = Infinity;
    for (const c of open) best = Math.min(best, travelMinutes(f, c, s));
    total += f.weight;
    weightedMin += f.weight * best;
    if (best <= s.threshold_min) covered += f.weight;
  }
  const coverage = covered / total;
  return { coverage, relative: coverage / ceiling, mean_min: weightedMin / total };
}
