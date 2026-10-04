// Map camera settings and the pure helpers behind the map (FRONTEND_SPEC.md section 6).

import type { Fire, StaticFire } from "@/types/data";
import type { RegionFilter, YearFilter } from "@/lib/filters";
import { mins } from "@/lib/format";
import type { TabId } from "@/lib/tabs";

export const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export const INITIAL_VIEW: ViewState = { longitude: -125.0, latitude: 54.5, zoom: 4.6, pitch: 0, bearing: 0 };

/** The map centre stays inside this box, so the view cannot drift away from BC. */
export const MAX_BOUNDS = { west: -142, east: -110, south: 47, north: 61 };
export const MIN_ZOOM = 3.5;
export const MAX_ZOOM = 12;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Keeps the camera flat, within the zoom range and centred inside MAX_BOUNDS. */
export function clampView(view: ViewState): ViewState {
  return {
    longitude: clamp(view.longitude, MAX_BOUNDS.west, MAX_BOUNDS.east),
    latitude: clamp(view.latitude, MAX_BOUNDS.south, MAX_BOUNDS.north),
    zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM),
    pitch: 0,
    bearing: 0,
  };
}

/** The fires the map draws for the header filters. Filters never change any score. */
export function filterFires(fires: Fire[], year: YearFilter, region: RegionFilter): Fire[] {
  if (year === "all" && region === "all") return fires;
  return fires.filter(
    (fire) => (year === "all" || fire.year === year) && (region === "all" || fire.region === region),
  );
}

/** Fire dot radius in pixels: bigger for fires that grew faster in their first 48 hours. */
export function fireRadius(fire: Pick<Fire, "weight">): number {
  return 2 + fire.weight / 4;
}

/**
 * Opacity (0-1) of a fire dot on a tab. Reachable fires are filled and unreachable ones are hollow
 * on every tab; this only dims them where the tab's subject is something else.
 */
export function fireOpacity(tab: TabId, reachable: boolean): number {
  if (tab === "evidence" || tab === "about") return 0.5;
  if (tab === "gaps") return reachable ? 0.25 : 1;
  return reachable ? 0.85 : 1;
}

/** Industrial heat sources are hidden where the map is only a backdrop. */
export function showsIndustrialSources(tab: TabId): boolean {
  return tab !== "evidence" && tab !== "about";
}

/** Hover text for a fire: id, date, weight, nearest minutes and region. */
export function fireTooltip(fire: Fire, thresholdMin: number): string {
  const reach = fire.reachable
    ? `${mins(fire.nearest_min)} from the nearest possible site`
    : `Beyond ${thresholdMin} min of every site (nearest: ${mins(fire.nearest_min)})`;
  return [`Fire ${fire.fire_id}`, `${fire.date} · ${fire.region}`, `Weight ${fire.weight} (early growth)`, reach].join("\n");
}

/** Hover text for an excluded industrial heat source. */
export function staticFireTooltip(fire: StaticFire): string {
  return [`Industrial heat source ${fire.fire_id}`, `Detected ${fire.year} · excluded from scoring`].join("\n");
}
