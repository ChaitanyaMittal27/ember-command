"use client";

import { useAppState } from "@/components/AppStateProvider";
import { ROW, TABLE, TD_LABEL, TD_NUMBER, TH, TH_NUMBER } from "@/components/tableStyles";
import type { AppData } from "@/lib/data";
import {
  baselineBars,
  beatsRandomLine,
  fairnessLine,
  gapPoints,
  overloadLine,
  pmedianNote,
  weightLine,
} from "@/lib/evidence";
import { pct } from "@/lib/format";

const SUBHEAD = "text-[14px] font-semibold";
const CAPTION = "text-[13px] leading-[1.5] text-muted";

/** Section 7.7, now the first part of About: how the layouts did on a year they were not fitted on, and the other checks. */
export function EvidenceSection({ data }: { data: AppData }) {
  const { state } = useAppState();
  const { evidence } = data;
  const k = state.evidenceK;
  const bars = baselineBars(evidence, k);
  const train = evidence.split.train;
  const trainYears = `${train[0]}–${train[train.length - 1]}`;
  const foldYears = evidence.loyo.folds.map((fold) => fold.held_out_year);
  const fairness = fairnessLine(evidence);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Does it work on fires it never saw?</h2>
        <p className="text-[14px] leading-[1.55] text-ink-2">
          Stations chosen from {trainYears} fires, scored on {evidence.split.test}.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <div className={CAPTION}>
          Share of the reachable {evidence.split.test} ceiling at {k} stations
        </div>
        <ul className="flex flex-col gap-2">
          {bars.map((bar) => (
            <li key={bar.label} className="grid grid-cols-[150px_minmax(0,1fr)_52px] items-center gap-2 text-[13px]">
              <span>{bar.label}</span>
              <div className="h-3 rounded bg-card" aria-hidden="true">
                <div
                  className={`h-3 rounded ${bar.ours ? "bg-station" : "bg-neutral"}`}
                  style={{ width: `${100 * bar.width}%` }}
                />
              </div>
              <span className="text-right font-mono font-medium">{pct(bar.value)}</span>
            </li>
          ))}
        </ul>
        <p className={CAPTION}>
          {beatsRandomLine(evidence, k)} Placing stations in the biggest towns does worse than random: they cluster in
          the southwest, away from the fires.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={SUBHEAD}>Leaving each year out in turn</h3>
        <p className={CAPTION}>
          {evidence.loyo.k} stations chosen on four years and scored on the fifth.
        </p>
        <table className={TABLE}>
          <thead>
            <tr className={ROW}>
              <th scope="col" className={TH}>
                Held-out year
              </th>
              <th scope="col" className={TH_NUMBER}>
                Coverage
              </th>
              <th scope="col" className={TH_NUMBER}>
                Ceiling
              </th>
              <th scope="col" className={TH_NUMBER}>
                Of ceiling
              </th>
            </tr>
          </thead>
          <tbody>
            {evidence.loyo.folds.map((fold) => (
              <tr key={fold.held_out_year} className={ROW}>
                <th scope="row" className={TD_LABEL}>
                  {fold.held_out_year}
                </th>
                <td className={TD_NUMBER}>{pct(fold.coverage)}</td>
                <td className={TD_NUMBER}>{pct(fold.ceiling)}</td>
                <td className={TD_NUMBER}>{pct(fold.relative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={CAPTION}>
          Site overlap between folds:{" "}
          <span className="font-mono font-medium text-ink">{evidence.loyo.mean_jaccard.toFixed(2)}</span> (sites
          change, but stations per fire centre stay stable).
        </p>
        <table className={TABLE}>
          <caption className="pb-1 text-left text-[12px] text-muted">
            Stations per fire centre when each year is held out
          </caption>
          <thead>
            <tr className={ROW}>
              <th scope="col" className={TH}>
                Fire centre
              </th>
              {foldYears.map((year) => (
                <th key={year} scope="col" className={TH_NUMBER}>
                  <span className="sr-only">without </span>
                  {`’${String(year).slice(2)}`}
                </th>
              ))}
              <th scope="col" className={TH_NUMBER}>
                Mean
              </th>
              <th scope="col" className={TH_NUMBER}>
                Std
              </th>
            </tr>
          </thead>
          <tbody>
            {evidence.loyo.region_stability.map((row) => (
              <tr key={row.region} className={ROW}>
                <th scope="row" className={TD_LABEL}>
                  {row.region}
                </th>
                {row.per_fold.map((count, index) => (
                  <td key={foldYears[index] ?? index} className={TD_NUMBER}>
                    {count}
                  </td>
                ))}
                <td className={TD_NUMBER}>{row.mean.toFixed(1)}</td>
                <td className={TD_NUMBER}>{row.std.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={SUBHEAD}>Is greedy close to optimal?</h3>
        <p className={CAPTION}>Coverage on {trainYears} fires: our step-by-step method against the exact best.</p>
        <table className={TABLE}>
          <thead>
            <tr className={ROW}>
              <th scope="col" className={TH_NUMBER}>
                K
              </th>
              <th scope="col" className={TH_NUMBER}>
                Greedy
              </th>
              <th scope="col" className={TH_NUMBER}>
                Exact
              </th>
              <th scope="col" className={TH_NUMBER}>
                Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {evidence.exact_check.coverage.map((row) => (
              <tr key={row.k} className={ROW}>
                <th scope="row" className={TD_NUMBER}>
                  {row.k}
                </th>
                <td className={TD_NUMBER}>{pct(row.greedy, 2)}</td>
                <td className={TD_NUMBER}>{pct(row.exact, 2)}</td>
                <td className={TD_NUMBER}>{gapPoints(row.gap_points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={CAPTION}>{pmedianNote(evidence)}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={SUBHEAD}>Other checks</h3>
        {fairness && <p className={CAPTION}>{fairness}</p>}
        <p className={CAPTION}>{weightLine(evidence)}</p>
        <p className={CAPTION}>{overloadLine(evidence)}</p>
      </section>
    </div>
  );
}
