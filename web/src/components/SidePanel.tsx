"use client";

import { useRef, useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { useDataState } from "@/components/DataProvider";
import { useHistory } from "@/components/HistoryProvider";
import { AboutTab } from "@/components/tabs/AboutTab";
import { GapsTab } from "@/components/tabs/GapsTab";
import { HallsTab } from "@/components/tabs/HallsTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { HowManyTab } from "@/components/tabs/HowManyTab";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { PlaceTab } from "@/components/tabs/PlaceTab";
import { usePanelWidth } from "@/components/usePanelWidth";
import type { AppData } from "@/lib/data";
import { isExpanded, PANEL_MIN_WIDTH, panelMaxWidth, toggleExpanded, widthAfterKey, widthFromPointer } from "@/lib/panel";
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
  const { width, windowWidth, setWidth } = usePanelWidth();
  // The width to go back to after "Expand panel".
  const [restoreTo, setRestoreTo] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = state.tab;
  const tabs = visibleTabs(history.configured);
  const expanded = isExpanded(width, windowWidth);

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

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    document.body.style.userSelect = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // Save once, when the drag ends.
    setWidth(widthFromPointer(event.clientX, window.innerWidth));
  }

  return (
    <aside
      style={{ "--panel-width": `${width}px` } as React.CSSProperties}
      className="relative flex min-w-[320px] max-w-none flex-[1_1_480px] flex-col border-t border-line bg-panel wide:min-h-0 wide:w-(--panel-width) wide:flex-none wide:border-l wide:border-t-0"
    >
      {/* Drag handle on the panel's left edge (desktop only): an 8px strip with a 2px line. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={width}
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuemax={panelMaxWidth(windowWidth)}
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
          document.body.style.userSelect = "none";
          setDragging(true);
          setRestoreTo(null);
        }}
        onPointerMove={(event) => {
          if (dragging) setWidth(widthFromPointer(event.clientX, window.innerWidth), false);
        }}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={(event) => {
          const next = widthAfterKey(event.key, width, window.innerWidth);
          if (next === null) return;
          event.preventDefault();
          setRestoreTo(null);
          setWidth(next);
        }}
        className="group absolute -left-1 top-0 z-20 hidden h-full w-2 cursor-col-resize touch-none outline-none wide:block"
      >
        <div
          className={
            "mx-auto h-full w-0.5 " +
            (dragging ? "bg-station" : "bg-transparent group-hover:bg-station group-focus-visible:bg-station")
          }
        />
      </div>

      <div className="flex items-start gap-1.5 border-b border-line px-2 py-3.5">
        <div role="tablist" aria-label="Sections" className="flex min-w-0 flex-1 flex-wrap gap-1">
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
                aria-label={item.label}
                title={item.label}
                aria-selected={selected}
                aria-controls="tab-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(item.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={
                  "min-h-9 cursor-pointer whitespace-nowrap rounded-md border px-1.5 py-1.5 text-[12px] " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station " +
                  (selected
                    ? "border-station bg-station-bg text-ink"
                    : "border-line-strong bg-transparent text-ink-2")
                }
              >
                {item.short}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={expanded ? "Restore panel width" : "Expand panel"}
          title={expanded ? "Restore panel width" : "Expand panel"}
          onClick={() => {
            const next = toggleExpanded(width, restoreTo, window.innerWidth);
            setRestoreTo(next.restoreTo);
            setWidth(next.width);
          }}
          className="hidden h-9 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line-strong text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station wide:inline-flex"
        >
          {/* Arrows point the way the panel's left edge will move. */}
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            {expanded ? <path d="M4 3l5 5-5 5M9 3l5 5-5 5" /> : <path d="M12 3L7 8l5 5M7 3L2 8l5 5" />}
          </svg>
        </button>
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
