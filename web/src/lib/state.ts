// Global app state (FRONTEND_SPEC.md section 5): one reducer, no state library.

import type { RegionFilter, YearFilter } from "@/lib/filters";
import { DEFAULT_TAB, type TabId } from "@/lib/tabs";

export type Q1VariantId = "capped_pmedian" | "fair";
export type HallTruckMode = "need" | "2x";
export type GapThreshold = 30 | 60 | 90;
export type EvidenceK = 10 | 20 | 40;

/** The fair variant starts with one station in each of the six fire centres. */
export const FAIR_MIN_K = 6;
export const MIN_TRUCKS_PER_STATION = 1;
export const MAX_TRUCKS_PER_STATION = 10;

export interface AppState {
  tab: TabId;
  yearFilter: YearFilter;
  regionFilter: RegionFilter;
  q1Variant: Q1VariantId;
  /** Number of stations on the Place stations tab: 1 to q1.k_max (fair: at least 6). */
  k: number;
  trucksPerStation: number;
  /** The layout after the user moved stations, or null while showing the optimized one. */
  editedLayout: number[] | null;
  selectedStation: number | null;
  hallTruckMode: HallTruckMode;
  gapThreshold: GapThreshold;
  evidenceK: EvidenceK;
}

export const initialState: AppState = {
  tab: DEFAULT_TAB,
  yearFilter: "all",
  regionFilter: "all",
  q1Variant: "capped_pmedian",
  k: 20,
  trucksPerStation: 2,
  editedLayout: null,
  selectedStation: null,
  hallTruckMode: "need",
  gapThreshold: 60,
  evidenceK: 20,
};

export type AppAction =
  | { type: "setTab"; tab: TabId }
  | { type: "setYearFilter"; value: YearFilter }
  | { type: "setRegionFilter"; value: RegionFilter }
  | { type: "setVariant"; variant: Q1VariantId }
  | { type: "setK"; k: number; kMax: number }
  | { type: "setTrucksPerStation"; trucks: number }
  | { type: "setEditedLayout"; layout: number[]; selected: number | null }
  | { type: "selectStation"; candId: number | null }
  | { type: "resetEdits" }
  | { type: "setHallTruckMode"; mode: HallTruckMode }
  | { type: "setGapThreshold"; threshold: GapThreshold }
  | { type: "setEvidenceK"; k: EvidenceK };

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, Math.round(value)));
}

function minK(variant: Q1VariantId): number {
  return variant === "fair" ? FAIR_MIN_K : 1;
}

const NO_EDITS = { editedLayout: null, selectedStation: null } as const;

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setTab":
      return { ...state, tab: action.tab, selectedStation: null };
    case "setYearFilter":
      return { ...state, yearFilter: action.value };
    case "setRegionFilter":
      return { ...state, regionFilter: action.value };
    case "setVariant":
      // Changing the variant resets edits; fair has no layout below six stations.
      return {
        ...state,
        ...NO_EDITS,
        q1Variant: action.variant,
        k: Math.max(state.k, minK(action.variant)),
      };
    case "setK":
      // Changing K resets edits.
      return { ...state, ...NO_EDITS, k: clamp(action.k, minK(state.q1Variant), action.kMax) };
    case "setTrucksPerStation":
      return {
        ...state,
        trucksPerStation: clamp(action.trucks, MIN_TRUCKS_PER_STATION, MAX_TRUCKS_PER_STATION),
      };
    case "setEditedLayout":
      return { ...state, editedLayout: action.layout, selectedStation: action.selected };
    case "selectStation":
      return { ...state, selectedStation: action.candId };
    case "resetEdits":
      return { ...state, ...NO_EDITS };
    case "setHallTruckMode":
      return { ...state, hallTruckMode: action.mode };
    case "setGapThreshold":
      return { ...state, gapThreshold: action.threshold };
    case "setEvidenceK":
      return { ...state, evidenceK: action.k };
  }
}
