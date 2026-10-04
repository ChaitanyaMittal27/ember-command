"use client";

import { useMemo } from "react";
import { CoverageChart, type ChartMarker } from "@/components/CoverageChart";
import { StatCard } from "@/components/StatCard";
import { useRowHighlight } from "@/components/useRowHighlight";
import { curvePoint } from "@/lib/curve";
import type { AppData } from "@/lib/data";
import { int, pct, siteName } from "@/lib/format";
import { sortStations } from "@/lib/howmany";
import { REGIONS } from "@/types/data";

const TH = "px-2 py-1.5 text-left text-[12px] font-normal text-muted";
const TD_NUMBER = "px-2 py-1.5 text-right font-mono font-medium";

/** Section 7.4: the fewest stations that reach the target, and the trucks they need. */
export function HowManyTab({ data }: { data: AppData }) {
  const { q2, meta } = data;
  const threshold = meta.settings.threshold_min;
  const stations = useMemo(() => sortStations(q2.stations), [q2.stations]);
  const { highlighted, listProps, rowProps } = useRowHighlight(stations.map((station) => station.cand_id));
  const atKStar = q2.k_star === null ? undefined : curvePoint(q2.curve, q2.k_star);

  const markers: ChartMarker[] = [
    ...(q2.k_star === null
      ? []
      : [{ k: q2.k_star, label: `${pct(q2.target_relative, 0)} of ceiling`, tone: "station" as const }]),
    {
      k: q2.elbow_k,
      label: `diminishing returns (K ${q2.elbow_range[0]}–${q2.elbow_range[1]})`,
      tone: "muted" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">How many stations, and how many trucks?</h2>
        <p className="text-[14px] leading-[1.55] text-ink-2">
          The fewest stations that reach {pct(q2.target_relative, 0)} of what is reachable at all, with trucks sized
          to how many fires each station sees burning at once on a busy day.
        </p>
      </div>

      {q2.k_star === null ? (
        <div className="rounded-lg bg-card p-3 text-[14px] leading-[1.5]">
          The target of {pct(q2.target_relative, 0)} of the reachable ceiling is not reached within{" "}
          <span className="font-mono font-medium">{int(q2.k_max)}</span> stations.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <StatCard size="md" tone="station" value={int(q2.k_star)} label="stations needed" />
          <StatCard size="md" value={int(q2.total_trucks)} label="trucks in total" />
          <StatCard size="md" tone="fire" value={pct(atKStar?.coverage)} label={`fire weight within ${threshold} min`} />
        </div>
      )}

      <CoverageChart curve={q2.curve} kMax={q2.k_max} ceiling={meta.ceiling.all_years} markers={markers} />

      {q2.by_region_at_k_star && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] text-muted">By fire centre, at {q2.k_star} stations</div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  Fire centre
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Stations
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Trucks
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
                const row = q2.by_region_at_k_star![region];
                return (
                  <tr key={region} className="border-b border-line">
                    <th scope="row" className="px-2 py-1.5 text-left font-normal">
                      {region}
                    </th>
                    <td className={TD_NUMBER}>{int(row.stations)}</td>
                    <td className={TD_NUMBER}>{int(row.trucks)}</td>
                    <td className={TD_NUMBER}>{pct(row.coverage)}</td>
                    <td className={TD_NUMBER}>{pct(row.relative)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {stations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div id="station-list-label" className="text-[13px] text-muted">
            The {stations.length} stations, most trucks first. Hover a row to find it on the map.
          </div>
          <div
            role="group"
            aria-labelledby="station-list-label"
            {...listProps}
            className="max-h-[320px] overflow-y-auto rounded-lg border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
          >
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>
                    Station
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Trucks
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Fires covered
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Peak at once
                  </th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => {
                  const candidate = data.candidatesById.get(station.cand_id);
                  const active = station.cand_id === highlighted;
                  return (
                    <tr
                      key={station.cand_id}
                      {...rowProps(station.cand_id)}
                      className={`border-b border-line last:border-b-0 ${active ? "bg-station-bg" : ""}`}
                    >
                      <th scope="row" className="px-2 py-1.5 text-left font-normal">
                        <div>{candidate ? siteName(candidate) : `Site ${station.cand_id}`}</div>
                        <div className="text-[12px] text-muted">{candidate?.region}</div>
                      </th>
                      <td className={`${TD_NUMBER} text-station-text`}>{int(station.trucks)}</td>
                      <td className={TD_NUMBER}>{int(station.fires_covered)}</td>
                      <td className={TD_NUMBER}>{int(station.peak_active)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
