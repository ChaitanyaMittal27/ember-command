"use client";

import { useHistory } from "@/components/HistoryProvider";
import { HISTORY_MAX_DATE, HISTORY_MAX_DAYS, HISTORY_MIN_DATE, validateRange } from "@/lib/historyParams";

const INPUT_CLASS =
  "min-h-10 rounded-md border border-line-strong bg-field px-2 py-1.5 text-[14px] text-ink [color-scheme:dark] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";

export const SECONDARY_BUTTON_CLASS =
  "min-h-10 cursor-pointer rounded-md border border-line-strong px-3 text-[13px] text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";

interface HistoryRangeFormProps {
  /** Keeps the input ids unique when the form is shown in two places. */
  idPrefix: string;
  /** Extra controls placed after the Load button. */
  children?: React.ReactNode;
}

/**
 * The two date inputs and the Load button. The dates live in HistoryProvider, so the form in the
 * tab and the one in the larger view always show the same values.
 */
export function HistoryRangeForm({ idPrefix, children }: HistoryRangeFormProps) {
  const { state, range, setRange, load } = useHistory();
  const check = validateRange(range.start, range.end);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        load(range.start, range.end);
      }}
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-start`} className="text-[13px] text-muted">
            From
          </label>
          <input
            id={`${idPrefix}-start`}
            type="date"
            className={INPUT_CLASS}
            value={range.start}
            min={HISTORY_MIN_DATE}
            max={HISTORY_MAX_DATE}
            onChange={(event) => setRange({ start: event.target.value, end: range.end })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-end`} className="text-[13px] text-muted">
            To
          </label>
          <input
            id={`${idPrefix}-end`}
            type="date"
            className={INPUT_CLASS}
            value={range.end}
            min={HISTORY_MIN_DATE}
            max={HISTORY_MAX_DATE}
            onChange={(event) => setRange({ start: range.start, end: event.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={!check.ok || state.status === "loading"}
          className="min-h-10 cursor-pointer rounded-md border border-station bg-station-bg px-4 text-[13px] text-ink disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
        >
          Load
        </button>
        {children}
      </div>
      <p className="text-[12px] leading-[1.5] text-muted" role={check.ok ? undefined : "alert"}>
        {check.ok
          ? `${check.days} days. Between ${HISTORY_MIN_DATE} and ${HISTORY_MAX_DATE}, at most ${HISTORY_MAX_DAYS} days at a time.`
          : check.message}
      </p>
    </form>
  );
}
