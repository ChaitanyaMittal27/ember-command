"use client";

import { useRef } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { useDataState } from "@/components/DataProvider";
import { useHistory } from "@/components/HistoryProvider";
import { AboutTab } from "@/components/tabs/AboutTab";
import { EvidenceTab } from "@/components/tabs/EvidenceTab";
import { GapsTab } from "@/components/tabs/GapsTab";
import { HallsTab } from "@/components/tabs/HallsTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { HowManyTab } from "@/components/tabs/HowManyTab";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { PlaceTab } from "@/components/tabs/PlaceTab";
import type { AppData } from "@/lib/data";
import { visibleTabs, type TabId } from "@/lib/tabs";

/** The active tab's content. */
function TabContent({ tab, data }: { tab: TabId; data: AppData }) {
  switch (tab) {
    case "overview":
      return <OverviewTab data={data} />;
    case "place":
      return <PlaceTab data={data} />;
    case "howmany":
      return <HowManyTab data={data} />;
    case "halls":
      return <HallsTab data={data} />;
    case "gaps":
      return <GapsTab data={data} />;
    case "evidence":
      return <EvidenceTab data={data} />;
    case "about":
      return <AboutTab data={data} />;
    case "history":
      return <HistoryTab />;
  }
}

export function SidePanel() {
  const { state, dispatch } = useAppState();
  const dataState = useDataState();
  const history = useHistory();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = state.tab;
  const tabs = visibleTabs(history.configured);

  function selectTab(id: TabId) {
    dispatch({ type: "setTab", tab: id });
    // The first visit to History loads the default date range.
    if (id === "history") history.ensureLoaded();
  }

  // Arrow keys, Home and End move between tabs, as in the WAI-ARIA tabs pattern.
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <aside className="flex min-w-[320px] max-w-none flex-[1_1_400px] flex-col border-t border-line bg-panel wide:min-h-0 wide:max-w-[460px] wide:border-l wide:border-t-0">
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3.5"
      >
        {tabs.map((item, index) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls="tab-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={
                "min-h-9 cursor-pointer rounded-md border px-3 py-1.5 text-[13px] " +
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station " +
                (selected
                  ? "border-station bg-station-bg text-ink"
                  : "border-line-strong bg-transparent text-ink-2")
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="tab-panel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-[18px]"
      >
        {dataState.status === "loading" && (
          <p role="status" className="m-auto py-10 text-center text-[14px] text-muted">
            Loading fire data…
          </p>
        )}
        {dataState.status === "error" && (
          <div role="alert" className="m-auto flex flex-col gap-2 py-10 text-center text-[14px] leading-[1.55]">
            <p className="text-ink">{dataState.message}</p>
            <p className="text-muted">Check that web/public/data/ contains the exported files.</p>
          </div>
        )}
        {dataState.status === "ready" && <TabContent tab={tab} data={dataState.data} />}
      </div>
    </aside>
  );
}
