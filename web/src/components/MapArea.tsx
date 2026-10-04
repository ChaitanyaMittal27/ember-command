"use client";

import dynamic from "next/dynamic";
import { useAppState } from "@/components/AppStateProvider";
import { useData } from "@/components/DataProvider";
import type { AppData } from "@/lib/data";
import { int } from "@/lib/format";
import { filterFires, showsIndustrialSources } from "@/lib/mapView";
import type { TabId } from "@/lib/tabs";

// The map needs WebGL and `window`, so it is never rendered on the server.
const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

const OVERLAY_CLASS = "absolute z-10 rounded-lg border border-line-strong bg-overlay px-3.5 py-2.5";

/** The tab-dependent summary line in the "Current layout" chip. */
function LayoutSummary({ tab, data }: { tab: TabId; data: AppData }) {
  if (tab === "overview") {
    return (
      <>
        <span className="font-mono font-medium text-fire-text">{int(data.meta.counts.fires)}</span> fires ·{" "}
        <span className="font-mono font-medium text-station-text">{int(data.meta.counts.candidates)}</span>{" "}
        possible sites
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

  const shown = data ? filterFires(data.fires.fires, state.yearFilter, state.regionFilter) : [];
  const beyond = shown.filter((fire) => !fire.reachable).length;
  const scope =
    (state.regionFilter === "all" ? "British Columbia" : `the ${state.regionFilter} fire centre`) +
    (state.yearFilter === "all" ? "" : ` in ${state.yearFilter}`);
  const description = data
    ? `Map of ${scope} showing ${int(shown.length)} fires as orange dots; ` +
      `${int(beyond)} of them, drawn as hollow rings, are beyond reach of every possible site.` +
      (industrial ? ` Grey dots mark ${int(data.staticFires.fires.length)} excluded industrial heat sources.` : "")
    : "Map of British Columbia. The fire data is still loading.";

  return (
    <main
      aria-label={description}
      data-fires-shown={data ? shown.length : undefined}
      className="relative h-[60vh] min-w-0 flex-[999_1_560px] overflow-hidden bg-map wide:h-auto"
    >
      <FireMap data={data} tab={state.tab} yearFilter={state.yearFilter} regionFilter={state.regionFilter} />

      {data && (
        <>
          <div className={`${OVERLAY_CLASS} left-4 top-4 flex flex-col gap-0.5`}>
            <div className="text-[12px] uppercase tracking-[0.8px] text-muted">Current layout</div>
            <div className="text-[15px]">
              <LayoutSummary tab={state.tab} data={data} />
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
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full border-2 border-ink bg-station" />
              Station, ring = 60-minute reach
            </div>
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
