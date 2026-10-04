"use client";

import { useAppState } from "@/components/AppStateProvider";
import { SegmentedControl } from "@/components/SegmentedControl";
import { StatCard } from "@/components/StatCard";
import { useRowHighlight } from "@/components/useRowHighlight";
import type { AppData } from "@/lib/data";
import { int, mins, pct, siteName } from "@/lib/format";
import { gainText, hallsCoveringNoFire, hallTruckTotal, matchingHeadline } from "@/lib/halls";
import type { HallTruckMode } from "@/lib/state";
import { REGIONS } from "@/types/data";

const TH = "px-2 py-1.5 text-left text-[12px] font-normal text-muted";
const TD_NUMBER = "px-2 py-1.5 text-right font-mono font-medium";

const TRUCK_MODES: { value: HallTruckMode; label: string }[] = [
  { value: "need", label: "Need by load" },
  { value: "2x", label: "Budget: 2 per hall" },
];

/** Section 7.5: how the existing fire halls score, their trucks, and the next stations to add. */
export function HallsTab({ data }: { data: AppData }) {
  const { state, dispatch } = useAppState();
  const { q3, meta, evidence } = data;
  const threshold = meta.settings.threshold_min;
  const headline = matchingHeadline(q3, meta, evidence);
  const { highlighted, listProps, rowProps } = useRowHighlight(q3.next_stations.map((next) => next.cand_id));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[18px] font-semibold">Today&apos;s fire halls</h2>

      {headline && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-card p-3.5">
          <p className="text-[16px] leading-[1.4]">
            <span className="font-mono font-medium text-station-text">{int(headline.k)}</span> well-placed stations
            reach as many fires as the <span className="font-mono font-medium">{int(headline.halls)}</span> existing
            halls.
          </p>
          <p className="text-[13px] leading-[1.5] text-muted">{headline.detail}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatCard size="md" tone="fire" value={pct(q3.score.coverage)} label={`fire weight within ${threshold} min`} />
        <StatCard size="md" value={pct(q3.score.relative)} label="of the reachable ceiling" />
        <StatCard size="md" value={mins(q3.score.mean_min)} label="average response" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[13px] text-muted">Trucks at the halls</div>
        <SegmentedControl
          label="How trucks are counted"
          options={TRUCK_MODES}
          value={state.hallTruckMode}
          onChange={(mode) => dispatch({ type: "setHallTruckMode", mode })}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            tone="station"
            value={int(hallTruckTotal(q3, state.hallTruckMode))}
            label={state.hallTruckMode === "need" ? "trucks the halls need by load" : "trucks at 2 per hall, split by load"}
          />
          <StatCard value={int(hallsCoveringNoFire(q3))} label={`halls cover no fire within ${threshold} min`} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] text-muted">By fire centre</div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={TH}>
                Fire centre
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Halls
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Coverage
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Of ceiling
              </th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.map((region) => {
              const row = q3.score.by_region[region];
              return (
                <tr key={region} className="border-b border-line">
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    {region}
                  </th>
                  <td className={TD_NUMBER}>{int(row.halls)}</td>
                  <td className={TD_NUMBER}>{pct(row.coverage)}</td>
                  <td className={TD_NUMBER}>{pct(row.relative)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5">
        <div id="next-list-label" className="text-[13px] text-muted">
          The next {q3.next_stations.length} stations to add, best first. Hover a row to find it on the map.
        </div>
        <div
          role="group"
          aria-labelledby="next-list-label"
          {...listProps}
          className="max-h-[320px] overflow-y-auto rounded-lg border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
        >
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="border-b border-line">
                <th scope="col" className={`${TH} text-right`}>
                  Rank
                </th>
                <th scope="col" className={TH}>
                  Site
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Coverage gained
                </th>
              </tr>
            </thead>
            <tbody>
              {q3.next_stations.map((next) => {
                const candidate = data.candidatesById.get(next.cand_id);
                return (
                  <tr
                    key={next.cand_id}
                    {...rowProps(next.cand_id)}
                    className={`border-b border-line last:border-b-0 ${next.cand_id === highlighted ? "bg-station-bg" : ""}`}
                  >
                    <td className={`${TD_NUMBER} text-station-text`}>{next.rank}</td>
                    <th scope="row" className="px-2 py-1.5 text-left font-normal">
                      <div>{candidate ? siteName(candidate) : `Site ${next.cand_id}`}</div>
                      <div className="text-[12px] text-muted">{candidate?.region}</div>
                    </th>
                    <td className={TD_NUMBER}>{gainText(next.gain)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[12px] leading-[1.5] text-faint">
        OpenStreetMap fire halls are mostly municipal, not BC Wildfire Service bases.
      </p>
    </div>
  );
}
