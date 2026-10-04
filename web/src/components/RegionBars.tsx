import { pct } from "@/lib/format";
import { REGIONS, type Region, type RegionScore } from "@/types/data";

/** One horizontal bar per fire centre: the share of that centre's own ceiling the layout reaches. */
export function RegionBars({ byRegion }: { byRegion: Record<Region, RegionScore> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[13px] text-muted">Reached in each fire centre, as a share of its own ceiling</div>
      <ul className="flex flex-col gap-2">
        {REGIONS.map((region) => {
          const score = byRegion[region];
          const detail = `${pct(score.coverage)} of ${region}'s fire weight is within reach`;
          return (
            <li
              key={region}
              title={detail}
              className="grid grid-cols-[110px_minmax(0,1fr)_56px] items-center gap-2 text-[13px]"
            >
              <span>{region}</span>
              <div className="h-2.5 rounded bg-card" aria-hidden="true">
                <div
                  className="h-2.5 rounded bg-fire"
                  style={{ width: `${Math.min(100, Math.max(0, 100 * score.relative))}%` }}
                />
              </div>
              <span className="text-right font-mono font-medium text-ink-2">{pct(score.relative)}</span>
              <span className="sr-only">{detail}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
