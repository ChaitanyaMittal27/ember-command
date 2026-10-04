// Drag-a-station (FRONTEND_SPEC.md section 7.3): move a station to another site and re-score live.

import type { AppData } from "@/lib/data";
import { REGIONS, scoreLayout, type Candidate, type Region, type RegionScore } from "@/types/data";

/**
 * The layout with station `from` moved to site `to`, keeping its position in the list.
 * Returns the same array, unchanged, if `to` is already open or `from` is not in the layout,
 * so a layout never gets a duplicate site and never changes length.
 */
export function replaceStation(layout: number[], from: number, to: number): number[] {
  if (layout.includes(to) || !layout.includes(from)) return layout;
  return layout.map((candId) => (candId === from ? to : candId));
}

export interface LiveScore {
  coverage: number;
  relative: number;
  mean_min: number;
  by_region: Record<Region, RegionScore>;
}

/**
 * Scores a layout in the browser with the contract's formula (`scoreLayout`), overall and per fire
 * centre. Each region's fires are scored against that region's own ceiling. Returns null for an
 * empty layout, which `scoreLayout` refuses.
 */
export function scoreLive(data: AppData, layout: number[]): LiveScore | null {
  const open = layout.flatMap((candId): Candidate[] => {
    const candidate = data.candidatesById.get(candId);
    return candidate ? [candidate] : [];
  });
  if (open.length === 0) return null;
  const { settings, ceiling } = data.meta;
  const overall = scoreLayout(data.fires.fires, open, settings, ceiling.all_years);
  const byRegion = Object.fromEntries(
    REGIONS.map((region) => {
      const score = scoreLayout(data.firesByRegion[region], open, settings, ceiling.by_region[region]);
      return [region, { coverage: score.coverage, relative: score.relative }];
    }),
  ) as Record<Region, RegionScore>;
  return { ...overall, by_region: byRegion };
}
