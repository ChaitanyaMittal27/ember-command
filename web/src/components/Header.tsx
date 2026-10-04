import { REGION_OPTIONS, YEAR_OPTIONS, type RegionFilter, type YearFilter } from "@/lib/filters";

const SELECT_CLASS =
  "min-h-10 rounded-md border border-line-strong bg-field px-2.5 py-2 text-[14px] text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";

interface HeaderProps {
  yearFilter: YearFilter;
  regionFilter: RegionFilter;
  onYearChange: (value: YearFilter) => void;
  onRegionChange: (value: RegionFilter) => void;
}

export function Header({ yearFilter, regionFilter, onYearChange, onRegionChange }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-ground px-6 py-3.5">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[20px] font-semibold tracking-[0.2px]">Ember Command</h1>
        <p className="text-[13px] text-muted">
          Where should BC base its wildfire trucks? Built on NASA satellite fire detections, 2019–2023.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="year-filter" className="text-[13px] text-muted">
          Fires shown
        </label>
        <select
          id="year-filter"
          className={SELECT_CLASS}
          value={String(yearFilter)}
          onChange={(event) => {
            const option = YEAR_OPTIONS.find((item) => String(item.value) === event.target.value);
            if (option) onYearChange(option.value);
          }}
        >
          {YEAR_OPTIONS.map((option) => (
            <option key={option.value} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="region-filter" className="text-[13px] text-muted">
          Fire centre
        </label>
        <select
          id="region-filter"
          className={SELECT_CLASS}
          value={regionFilter}
          onChange={(event) => {
            const option = REGION_OPTIONS.find((item) => item.value === event.target.value);
            if (option) onRegionChange(option.value);
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
