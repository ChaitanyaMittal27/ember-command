"use client";

import { useAppState } from "@/components/AppStateProvider";
import { useData } from "@/components/DataProvider";
import { REGION_OPTIONS, yearOptions } from "@/lib/filters";

const SELECT_CLASS =
  "h-10 rounded-md border border-line-strong bg-field px-2.5 text-[14px] text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";
// The labels are always there for screen readers; they are only drawn where there is room.
const LABEL_CLASS = "sr-only text-[13px] text-muted sm:not-sr-only";

const FILTER_NOTE = "Filters change the map only; scores cover all of BC, 2019–2023.";

export function Header() {
  const { state, dispatch } = useAppState();
  const data = useData();
  // The years come from the data, so the list is just "All years" until it has loaded.
  const years = yearOptions(data?.meta.data.years ?? []);
  const filtered = state.yearFilter !== "all" || state.regionFilter !== "all";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-ground px-4 wide:px-6">
      <h1 className="text-[20px] font-semibold tracking-[0.2px]">FirstDue</h1>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {filtered && (
          // One row whatever the width: the sentence where it fits, an icon carrying it where it does not.
          <p role="status" className="flex items-center text-[12px] text-muted">
            <span className="hidden min-[1100px]:inline">{FILTER_NOTE}</span>
            <span
              role="img"
              aria-label={FILTER_NOTE}
              title={FILTER_NOTE}
              tabIndex={0}
              className="inline-flex size-6 items-center justify-center rounded-full border border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station min-[1100px]:hidden"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                <circle cx="8" cy="4.2" r="1.1" fill="currentColor" />
                <rect x="7.1" y="6.6" width="1.8" height="5.6" rx="0.6" fill="currentColor" />
              </svg>
            </span>
          </p>
        )}
        <label htmlFor="year-filter" className={LABEL_CLASS}>
          Fires shown
        </label>
        <select
          id="year-filter"
          className={SELECT_CLASS}
          value={String(state.yearFilter)}
          onChange={(event) => {
            const option = years.find((item) => String(item.value) === event.target.value);
            if (option) dispatch({ type: "setYearFilter", value: option.value });
          }}
        >
          {years.map((option) => (
            <option key={option.value} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="region-filter" className={LABEL_CLASS}>
          Fire centre
        </label>
        <select
          id="region-filter"
          className={SELECT_CLASS}
          value={state.regionFilter}
          onChange={(event) => {
            const option = REGION_OPTIONS.find((item) => item.value === event.target.value);
            if (option) dispatch({ type: "setRegionFilter", value: option.value });
          }}
        >
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
