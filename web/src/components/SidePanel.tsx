"use client";

import { useRef } from "react";
import { TABS, type TabId } from "@/lib/tabs";

interface SidePanelProps {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function SidePanel({ tab, onTabChange }: SidePanelProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];

  // Arrow keys, Home and End move between tabs, as in the WAI-ARIA tabs pattern.
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onTabChange(TABS[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <aside className="flex min-w-[320px] max-w-none flex-[1_1_400px] flex-col border-t border-line bg-panel wide:max-w-[460px] wide:border-l wide:border-t-0">
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3.5"
      >
        {TABS.map((item, index) => {
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
              onClick={() => onTabChange(item.id)}
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
        aria-labelledby={`tab-${active.id}`}
        tabIndex={0}
        className="flex flex-col gap-[18px] overflow-y-auto px-5 py-[18px]"
      >
        <h2 className="text-[18px] font-semibold">{active.heading}</h2>
        <p className="text-[13px] leading-[1.55] text-muted">This section is built in step {active.step}.</p>
      </div>
    </aside>
  );
}
