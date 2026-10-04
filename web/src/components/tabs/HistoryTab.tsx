"use client";

import { useMemo, useRef, useState } from "react";
import { HistoryChart } from "@/components/HistoryChart";
import { useHistory, type HistoryData } from "@/components/HistoryProvider";
import { HistoryRangeForm, SECONDARY_BUTTON_CLASS } from "@/components/HistoryRangeForm";
import { StatCard } from "@/components/StatCard";
import { ROW, TABLE, TD_LABEL, TD_NUMBER, TH, TH_NUMBER } from "@/components/tableStyles";
import { int, pct } from "@/lib/format";
import { dailySeries, regionTotals, sortedRegionTotals, totalDetections } from "@/lib/history";

const TIGER_NOTE = "Live from Tiger Data (TimescaleDB): 538,508 detections, daily continuous aggregates.";

/** The loaded range shaped for the chart and the totals. */
function useChartData(data: HistoryData | null) {
  return useMemo(
    () =>
      data
        ? {
            series: dailySeries(data.daily, data.start, data.end),
            totals: regionTotals(data.daily),
            total: totalDetections(data.daily),
          }
        : null,
    [data],
  );
}

/** Loading and error messages shared by the tab and the larger view. */
function LoadStatus() {
  const { state } = useHistory();
  if (state.status === "loading") {
    return (
      <p role="status" className="py-6 text-center text-[14px] text-muted">
        Loading detections for {state.start} to {state.end}…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col gap-1 rounded-lg bg-card p-3 text-[14px] leading-[1.5]">
        <p className="text-ink">{state.message}</p>
        <p className="text-muted">Nothing was loaded. Check the dates and press Load to try again.</p>
      </div>
    );
  }
  return null;
}

/** The pop-out view: the same dates and data as the tab, with a much larger chart. */
function LargerView({ onClose }: { onClose: () => void }) {
  const { state } = useHistory();
  const data = state.status === "ready" ? state.data : null;
  const chart = useChartData(data);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-dialog-title" className="text-[18px] font-semibold">
          Fire history
        </h2>
        <button
          type="button"
          autoFocus
          aria-label="Close larger view"
          title="Close"
          onClick={onClose}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-line-strong text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </div>

      <HistoryRangeForm idPrefix="history-dialog" />
      <LoadStatus />

      {data && chart && (
        <>
          {/* About 60% of the dialog's height, and never too short to read. */}
          <div className="h-[60%] min-h-[280px] shrink-0">
            <HistoryChart series={chart.series} totals={chart.totals} start={data.start} end={data.end} size="large" />
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid grid-cols-2 content-start gap-2.5">
              <StatCard tone="fire" value={int(chart.total)} label="satellite detections" />
              <StatCard value={int(data.ignitions)} label="fires started (ignitions)" />
            </div>
            <table className={TABLE}>
              <caption className="pb-1 text-left text-[12px] text-muted">
                Detections per fire centre, {data.start} to {data.end}
              </caption>
              <thead>
                <tr className={ROW}>
                  <th scope="col" className={TH}>
                    Fire centre
                  </th>
                  <th scope="col" className={TH_NUMBER}>
                    Detections
                  </th>
                  <th scope="col" className={TH_NUMBER}>
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRegionTotals(chart.totals).map((row) => (
                  <tr key={row.region} className={ROW}>
                    <th scope="row" className={TD_LABEL}>
                      {row.region}
                    </th>
                    <td className={TD_NUMBER}>{int(row.detections)}</td>
                    <td className={TD_NUMBER}>{pct(row.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-[12px] leading-[1.5] text-faint">{TIGER_NOTE}</p>
    </div>
  );
}

/** Step F11: satellite detections over a chosen date range, queried live from Tiger Data. */
export function HistoryTab() {
  const { state, ensureLoaded } = useHistory();
  const data = state.status === "ready" ? state.data : null;
  const chart = useChartData(data);
  const dialog = useRef<HTMLDialogElement>(null);
  // The larger view's content is only mounted while the dialog is open.
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Fire history</h2>
        <p className="text-[14px] leading-[1.55] text-ink-2">
          Every satellite detection behind the fires, for any stretch of the 2019–2023 seasons. The map shows where
          they were.
        </p>
      </div>

      <HistoryRangeForm idPrefix="history">
        <button
          type="button"
          aria-haspopup="dialog"
          className={SECONDARY_BUTTON_CLASS}
          onClick={() => {
            // Opening never refetches: it shows whatever is loaded (and loads the default once if nothing is).
            ensureLoaded();
            setOpen(true);
            dialog.current?.showModal();
          }}
        >
          Open larger view
        </button>
      </HistoryRangeForm>
      <LoadStatus />

      {data && chart && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard tone="fire" value={int(chart.total)} label="satellite detections" />
            <StatCard value={int(data.ignitions)} label="fires started (ignitions)" />
          </div>
          <HistoryChart series={chart.series} totals={chart.totals} start={data.start} end={data.end} />
        </>
      )}

      <p className="text-[12px] leading-[1.5] text-faint">{TIGER_NOTE}</p>

      {/* A modal <dialog>: the browser traps focus inside it, closes it on Escape, and returns focus
          to the button that opened it. */}
      <dialog
        ref={dialog}
        aria-labelledby="history-dialog-title"
        onClose={() => setOpen(false)}
        className="m-auto h-[85vh] max-h-none w-[90vw] max-w-none rounded-lg border border-line-strong bg-panel p-0 text-ink backdrop:bg-black/60"
      >
        {open && <LargerView onClose={() => dialog.current?.close()} />}
      </dialog>
    </div>
  );
}
