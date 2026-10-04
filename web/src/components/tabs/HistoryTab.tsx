"use client";

import { useMemo, useState } from "react";
import { HistoryChart } from "@/components/HistoryChart";
import { useHistory } from "@/components/HistoryProvider";
import { StatCard } from "@/components/StatCard";
import { int } from "@/lib/format";
import { dailySeries, regionTotals, totalDetections } from "@/lib/history";
import {
  HISTORY_DEFAULT_END,
  HISTORY_DEFAULT_START,
  HISTORY_MAX_DATE,
  HISTORY_MAX_DAYS,
  HISTORY_MIN_DATE,
  validateRange,
} from "@/lib/historyParams";

const INPUT_CLASS =
  "min-h-10 rounded-md border border-line-strong bg-field px-2 py-1.5 text-[14px] text-ink [color-scheme:dark] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station";

/** Step F11: satellite detections over a chosen date range, queried live from Tiger Data. */
export function HistoryTab() {
  const { state, load } = useHistory();
  const [start, setStart] = useState(HISTORY_DEFAULT_START);
  const [end, setEnd] = useState(HISTORY_DEFAULT_END);
  const range = validateRange(start, end);
  const data = state.status === "ready" ? state.data : null;

  const chart = useMemo(
    () =>
      data
        ? { series: dailySeries(data.daily, data.start, data.end), totals: regionTotals(data.daily), total: totalDetections(data.daily) }
        : null,
    [data],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Fire history</h2>
        <p className="text-[14px] leading-[1.55] text-ink-2">
          Every satellite detection behind the fires, for any stretch of the 2019–2023 seasons. The map shows where
          they were.
        </p>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load(start, end);
        }}
      >
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="history-start" className="text-[13px] text-muted">
              From
            </label>
            <input
              id="history-start"
              type="date"
              className={INPUT_CLASS}
              value={start}
              min={HISTORY_MIN_DATE}
              max={HISTORY_MAX_DATE}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="history-end" className="text-[13px] text-muted">
              To
            </label>
            <input
              id="history-end"
              type="date"
              className={INPUT_CLASS}
              value={end}
              min={HISTORY_MIN_DATE}
              max={HISTORY_MAX_DATE}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!range.ok || state.status === "loading"}
            className="min-h-10 cursor-pointer rounded-md border border-station bg-station-bg px-4 text-[13px] text-ink disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-transparent disabled:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
          >
            Load
          </button>
        </div>
        <p className="text-[12px] leading-[1.5] text-muted" role={range.ok ? undefined : "alert"}>
          {range.ok
            ? `${range.days} days. Between ${HISTORY_MIN_DATE} and ${HISTORY_MAX_DATE}, at most ${HISTORY_MAX_DAYS} days at a time.`
            : range.message}
        </p>
      </form>

      {state.status === "loading" && (
        <p role="status" className="py-6 text-center text-[14px] text-muted">
          Loading detections for {state.start} to {state.end}…
        </p>
      )}
      {state.status === "error" && (
        <div role="alert" className="flex flex-col gap-1 rounded-lg bg-card p-3 text-[14px] leading-[1.5]">
          <p className="text-ink">{state.message}</p>
          <p className="text-muted">Nothing was loaded. Check the dates and press Load to try again.</p>
        </div>
      )}
      {data && chart && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard tone="fire" value={int(chart.total)} label="satellite detections" />
            <StatCard value={int(data.ignitions)} label="fires started (ignitions)" />
          </div>
          <HistoryChart series={chart.series} totals={chart.totals} start={data.start} end={data.end} />
        </>
      )}

      <p className="text-[12px] leading-[1.5] text-faint">
        Live from Tiger Data (TimescaleDB): 538,508 detections, daily continuous aggregates.
      </p>
    </div>
  );
}
