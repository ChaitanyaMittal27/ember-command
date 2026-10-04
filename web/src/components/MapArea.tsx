"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { useData } from "@/components/DataProvider";
import { curvePoint } from "@/lib/curve";
import type { AppData } from "@/lib/data";
import { int, pct } from "@/lib/format";
import { filterFires, showsIndustrialSources } from "@/lib/mapView";
import { q1Layout } from "@/lib/place";
import type { AppState } from "@/lib/state";
import type { Candidate } from "@/types/data";

// The map needs WebGL and `window`, so it is never rendered on the server.
const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

const OVERLAY_CLASS = "absolute z-10 rounded-lg border border-line-strong bg-overlay px-3.5 py-2.5";
const NO_STATIONS: Candidate[] = [];

/** The tab-dependent summary line in the "Current layout" chip. */
function LayoutSummary({ state, data }: { state: AppState; data: AppData }) {
  if (state.tab === "overview") {
    return (
      <>
        <span className="font-mono font-medium text-fire-text">{int(data.meta.counts.fires)}</span> fires ·{" "}
        <span className="font-mono font-medium text-station-text">{int(data.meta.counts.candidates)}</span>{" "}
        possible sites
      </>
    );
  }
  if (state.tab === "place") {
    const point = curvePoint(data.q1.variants[state.q1Variant].curve, state.k);
    return (
      <>
        <span className="font-mono font-medium text-station-text">{state.k}</span>{" "}
        {state.k === 1 ? "station" : "stations"} ·{" "}
        <span className="font-mono font-medium text-fire-text">{pct(point?.coverage)}</span> of fire weight within{" "}
        {data.meta.settings.threshold_min} min
      </>
    );
  }
  return <span className="text-ink-2">No layout shown yet</span>;
}

/** The map column: the map itself, plus the layout chip, legend and attribution laid over it. */
export function MapArea() {
  const { state } = useAppState();
  const data = useData();
  const industrial = showsIndustrialSources(state.tab);

  // The stations drawn on the map: the Q1 layout at K on the Place stations tab.
  const stations = useMemo(() => {
    if (!data || state.tab !== "place") return NO_STATIONS;
    return q1Layout(data.q1, state.q1Variant, state.k).flatMap((candId) => data.candidatesById.get(candId) ?? []);
  }, [data, state.tab, state.q1Variant, state.k]);

  const shown = data ? filterFires(data.fires.fires, state.yearFilter, state.regionFilter) : [];
  const beyond = shown.filter((fire) => !fire.reachable).length;
  const threshold = data?.meta.settings.threshold_min;
  const scope =
    (state.regionFilter === "all" ? "British Columbia" : `the ${state.regionFilter} fire centre`) +
    (state.yearFilter === "all" ? "" : ` in ${state.yearFilter}`);
  const description = data
    ? `Map of ${scope} showing ${int(shown.length)} fires as orange dots; ` +
      `${int(beyond)} of them, drawn as hollow rings, are beyond reach of every possible site.` +
      (stations.length
        ? ` ${stations.length === 1 ? "1 station is" : `${stations.length} stations are`} shown as blue dots, ` +
          `each with a ring for its ${threshold}-minute reach.`
        : "") +
      (industrial ? ` Grey dots mark ${int(data.staticFires.fires.length)} excluded industrial heat sources.` : "")
    : "Map of British Columbia. The fire data is still loading.";

  return (
    <main
      aria-label={description}
      data-fires-shown={data ? shown.length : undefined}
      data-stations-shown={data ? stations.length : undefined}
      className="relative h-[60vh] min-w-0 flex-[999_1_560px] overflow-hidden bg-map wide:h-auto"
    >
      <FireMap
        data={data}
        tab={state.tab}
        yearFilter={state.yearFilter}
        regionFilter={state.regionFilter}
        stations={stations}
        reachKm={data?.meta.settings.reach_km ?? 0}
      />

      {data && (
        <>
          <div className={`${OVERLAY_CLASS} left-4 top-4 flex flex-col gap-0.5`}>
            <div className="text-[12px] uppercase tracking-[0.8px] text-muted">Current layout</div>
            <div className="text-[15px]">
              <LayoutSummary state={state} data={data} />
            </div>
          </div>

          <div className={`${OVERLAY_CLASS} bottom-4 left-4 flex flex-col gap-1.5 text-[13px]`}>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-fire" />
              Fire (size = early growth)
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full border-[1.5px] border-fire" />
              Fire beyond reach of any site
            </div>
            {stations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full border-2 border-ink bg-station" />
                Station, ring = {threshold}-minute reach
              </div>
            )}
            {industrial && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-neutral" />
                Industrial heat source (excluded)
              </div>
            )}
          </div>
        </>
      )}

      <p className="absolute bottom-1 right-2 z-10 rounded bg-overlay px-1.5 py-0.5 text-[11px] text-muted">
        ©{" "}
        <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">
          CARTO
        </a>{" "}
        ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors
      </p>
    </main>
  );
}
