import { StatCard } from "@/components/StatCard";
import type { AppData } from "@/lib/data";
import { int, pct } from "@/lib/format";

/** Section 7.1: what the tool answers, with the four headline numbers. */
export function OverviewTab({ data }: { data: AppData }) {
  const { meta, gaps } = data;
  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="text-[18px] font-semibold">What this answers</h2>
      <p className="text-[14px] leading-[1.55] text-ink-2">
        Five years of satellite fire detections, grouped into {int(meta.counts.fires)} fires.{" "}
        {int(meta.counts.candidates)} possible sites: every town and existing fire hall. For any number of
        stations, the tool finds where they reach the most fires within an hour by road.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard value={int(meta.counts.fires)} label="fires, 2019–2023" tone="fire" />
        <StatCard value={int(meta.counts.candidates)} label="candidate sites" tone="station" />
        <StatCard value={pct(meta.ceiling.all_years)} label="best possible, every site open" />
        <StatCard
          value={pct(gaps.overall.unreachable_weight_share)}
          label="of fire weight beyond an hour of any site"
        />
      </div>
    </div>
  );
}
