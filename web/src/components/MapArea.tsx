"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { useData } from "@/components/DataProvider";
import { useHistory, type HistoryData } from "@/components/HistoryProvider";
import { usePlaceLayout } from "@/components/usePlaceLayout";
import { curvePoint } from "@/lib/curve";
import type { AppData } from "@/lib/data";
import { int, pct } from "@/lib/format";
import { filterFires, showsIndustrialSources } from "@/lib/mapView";
import { replaceStation } from "@/lib/edit";
import { gapReachKm } from "@/lib/evidence";
import { hallMarkers, nextMarkers, type HallMarker, type NextMarker } from "@/lib/halls";
import { totalDetections } from "@/lib/history";
import type { CellRow } from "@/lib/historyTypes";
import { stationLoadNote, truckRadii } from "@/lib/howmany";
import type { AppState } from "@/lib/state";
import type { Candidate } from "@/types/data";

// The map needs WebGL and `window`, so it is never rendered on the server.
const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

const OVERLAY_CLASS = "absolute z-10 rounded-lg border border-line-strong bg-overlay px-3.5 py-2.5";
const NO_STATIONS: Candidate[] = [];
const NO_HALLS: HallMarker[] = [];
const NO_NEXT: NextMarker[] = [];
const NO_CELLS: CellRow[] = [];

/** The tab-dependent summary line in the "Current layout" chip. */
function LayoutSummary({
  state,
  data,
  liveCoverage,
  history,
}: {
  state: AppState;
  data: AppData;
  /** Coverage of the edited layout, while there is one. */
  liveCoverage?: number;
  /** The loaded history range, on the History tab. */
  history: HistoryData | null;
}) {
  if (state.tab === "history") {
    if (!history) return <span className="text-ink-2">No detections loaded</span>;
    return (
      <>
        <span className="font-mono font-medium text-fire-text">{int(totalDetections(history.daily))}</span> satellite
        detections · {history.start} to {history.end}
      </>
    );
  }
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
        <span className="font-mono font-medium text-fire-text">{pct(liveCoverage ?? point?.coverage)}</span> of fire
        weight within {data.meta.settings.threshold_min} min{liveCoverage === undefined ? "" : " (edited)"}
      </>
    );
  }
  if (state.tab === "howmany") {
    if (data.q2.k_star === null) return <span className="text-ink-2">Target not reached</span>;
    return (
      <>
        <span className="font-mono font-medium text-station-text">{int(data.q2.k_star)}</span> stations ·{" "}
        <span className="font-mono font-medium text-ink">{int(data.q2.total_trucks)}</span> trucks
      </>
    );
  }
  if (state.tab === "halls") {
    return (
      <>
        <span className="font-mono font-medium text-station-text">{int(data.q3.halls.length)}</span> halls ·{" "}
        <span className="font-mono font-medium text-fire-text">{pct(data.q3.score.coverage)}</span> of fire weight
        within {data.meta.settings.threshold_min} min
      </>
    );
  }
  if (state.tab === "gaps") {
    return (
      <>
        Every site open ·{" "}
        <span className="font-mono font-medium text-station-text">{data.gaps.threshold_min}</span>-minute reach
      </>
    );
  }
  return (
    <span className="text-ink-2">
      No layout shown · <span className="font-mono font-medium text-fire-text">{int(data.meta.counts.fires)}</span>{" "}
      fires
    </span>
  );
}

/** The map column: the map itself, plus the layout chip, legend and attribution laid over it. */
export function MapArea() {
  const { state, dispatch } = useAppState();
  const data = useData();
  const industrial = showsIndustrialSources(state.tab);
  const { layout, live } = usePlaceLayout(data);
  const onPlaceTab = state.tab === "place";
  const onHowManyTab = state.tab === "howmany";
  const onHallsTab = state.tab === "halls";
  const onGapsTab = state.tab === "gaps";
  const onHistoryTab = state.tab === "history";
  const historyState = useHistory().state;
  const history = onHistoryTab && historyState.status === "ready" ? historyState.data : null;

  // On Existing halls: every hall as a square sized by trucks, plus the next stations to add.
  const halls = useMemo(
    () => (data && onHallsTab ? hallMarkers(data.q3, data.candidatesById, state.hallTruckMode) : NO_HALLS),
    [data, onHallsTab, state.hallTruckMode],
  );
  const nextStations = useMemo(
    () => (data && onHallsTab ? nextMarkers(data.q3, data.candidatesById) : NO_NEXT),
    [data, onHallsTab],
  );

  // The stations drawn on the map: the Q1 layout at K (or the edited one) on Place stations,
  // and the Q2 layout at k_star on How many.
  const stations = useMemo(() => {
    if (!data) return NO_STATIONS;
    const ids = onPlaceTab ? layout : onHowManyTab ? data.q2.stations.map((station) => station.cand_id) : [];
    return ids.length ? ids.flatMap((candId) => data.candidatesById.get(candId) ?? []) : NO_STATIONS;
  }, [data, onPlaceTab, onHowManyTab, layout]);

  // On How many, stations are sized by their trucks and say so in their tooltip.
  const truckSizing = useMemo(() => {
    if (!data || !onHowManyTab || data.q2.stations.length === 0) return undefined;
    return {
      radii: truckRadii(data.q2.stations),
      notes: new Map(data.q2.stations.map((station) => [station.cand_id, stationLoadNote(station)])),
    };
  }, [data, onHowManyTab]);

  // Candidate sites show while a station is picked up for moving, and on Gaps, where every site is open.
  const moving = onPlaceTab && state.selectedStation !== null;
  const candidates = data && (moving || onGapsTab) ? data.candidates.candidates : NO_STATIONS;
  const reachKm = !data ? 0 : onGapsTab ? gapReachKm(data.gaps, data.meta.settings.reach_km) : data.meta.settings.reach_km;

  // Escape puts the station back down.
  useEffect(() => {
    if (!moving) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dispatch({ type: "selectStation", candId: null });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moving, dispatch]);

  function moveSelectedTo(candId: number) {
    if (state.selectedStation === null) return;
    const next = replaceStation(layout, state.selectedStation, candId);
    // Clicking a site that is already a station does nothing.
    if (next !== layout) dispatch({ type: "setEditedLayout", layout: next, selected: candId });
  }

  const shown = data ? filterFires(data.fires.fires, state.yearFilter, state.regionFilter) : [];
  const beyond = shown.filter((fire) => !fire.reachable).length;
  const threshold = data?.meta.settings.threshold_min;
  const scope =
    (state.regionFilter === "all" ? "British Columbia" : `the ${state.regionFilter} fire centre`) +
    (state.yearFilter === "all" ? "" : ` in ${state.yearFilter}`);
  const description = !data
    ? "Map of British Columbia. The fire data is still loading."
    : onHistoryTab
      ? history
        ? `Map of British Columbia showing ${int(totalDetections(history.daily))} satellite detections from ` +
          `${history.start} to ${history.end} as orange dots, one per 0.1-degree cell, larger where there were more.`
        : "Map of British Columbia. No satellite detections are loaded yet."
      : `Map of ${scope} showing ${int(shown.length)} fires as orange dots; ` +
      `${int(beyond)} of them, drawn as hollow rings, are beyond reach of every possible site.` +
      (stations.length
        ? ` ${stations.length === 1 ? "1 station is" : `${stations.length} stations are`} shown as blue dots` +
          `${onHowManyTab ? " sized by their trucks" : ""}, each with a ring for its ${threshold}-minute reach.`
        : "") +
      (onGapsTab
        ? ` All ${int(candidates.length)} possible sites are shown, each with a ring for its ${threshold}-minute reach.`
        : "") +
      (halls.length
        ? ` ${int(halls.length)} existing fire halls are shown as blue squares sized by their trucks, and the next ` +
          `${nextStations.length} stations to add as numbered blue circles.`
        : "") +
      (industrial ? ` Grey dots mark ${int(data.staticFires.fires.length)} excluded industrial heat sources.` : "");

  return (
    <main
      aria-label={description}
      data-fires-shown={data ? (onHistoryTab ? 0 : shown.length) : undefined}
      data-heat-cells={data ? (history?.cells.length ?? 0) : undefined}
      data-stations-shown={data ? stations.length : undefined}
      data-selected-station={moving ? (state.selectedStation ?? undefined) : undefined}
      data-highlighted-station={onHowManyTab || onHallsTab ? (state.hoveredStation ?? undefined) : undefined}
      data-halls-shown={data ? halls.length : undefined}
      data-hall-sizes={halls.length ? [...new Set(halls.map((hall) => hall.size))].sort((a, b) => a - b).join(",") : undefined}
      data-next-shown={data ? nextStations.length : undefined}
      data-candidates-shown={data ? candidates.length : undefined}
      className="relative h-[60vh] min-w-0 flex-[999_1_560px] overflow-hidden bg-map wide:h-auto"
    >
      <FireMap
        data={data}
        tab={state.tab}
        yearFilter={state.yearFilter}
        regionFilter={state.regionFilter}
        stations={stations}
        reachKm={reachKm}
        ringSites={onGapsTab ? candidates : undefined}
        ringsBelowFires={onGapsTab}
        stationRadii={truckSizing?.radii}
        stationNotes={truckSizing?.notes}
        selectedStation={moving ? state.selectedStation : onHowManyTab ? state.hoveredStation : null}
        halls={halls}
        nextStations={nextStations}
        highlightedNext={onHallsTab ? state.hoveredStation : null}
        heatCells={history?.cells ?? NO_CELLS}
        candidates={candidates}
        onStationClick={(candId) => {
          if (onPlaceTab) dispatch({ type: "selectStation", candId: candId === state.selectedStation ? null : candId });
        }}
        onCandidateClick={moveSelectedTo}
        onBackgroundClick={() => {
          if (state.selectedStation !== null) dispatch({ type: "selectStation", candId: null });
        }}
      />

      {data && (
        <>
          <div className={`${OVERLAY_CLASS} left-4 top-4 flex flex-col gap-0.5`}>
            <div className="text-[12px] uppercase tracking-[0.8px] text-muted">Current layout</div>
            <div className="text-[15px]">
              <LayoutSummary
                state={state}
                data={data}
                liveCoverage={onPlaceTab ? live?.coverage : undefined}
                history={history}
              />
            </div>
          </div>

          <div className={`${OVERLAY_CLASS} bottom-4 left-4 flex flex-col gap-1.5 text-[13px]`}>
            {onHistoryTab ? (
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full bg-fire opacity-60" />
                Satellite detections per 0.1° cell (size = how many)
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full bg-fire" />
                  Fire (size = early growth)
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full border-[1.5px] border-fire" />
                  Fire beyond reach of any site
                </div>
              </>
            )}
            {stations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full border-2 border-ink bg-station" />
                Station{onHowManyTab ? " (size = trucks)" : ""}, ring = {threshold}-minute reach
              </div>
            )}
            {onGapsTab && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full border border-ring-stroke bg-ring-fill" />
                Within {threshold} minutes of a possible site
              </div>
            )}
            {halls.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2.5 bg-station" />
                  Existing fire hall (size = trucks)
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-3 rounded-full border-2 border-station" />
                  Next station to add (numbered by rank)
                </div>
              </>
            )}
            {industrial && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-neutral" />
                Industrial heat source (excluded)
              </div>
            )}
            {moving && (
              <div className="flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-muted opacity-50" />
                Possible site (click one to move the station there)
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
