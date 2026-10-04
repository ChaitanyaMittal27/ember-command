"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppStateProvider";
import { CoverageChart } from "@/components/CoverageChart";
import { RegionBars } from "@/components/RegionBars";
import { SegmentedControl } from "@/components/SegmentedControl";
import { StatCard, type StatDelta } from "@/components/StatCard";
import { usePlaceLayout } from "@/components/usePlaceLayout";
import { curvePoint } from "@/lib/curve";
import type { AppData } from "@/lib/data";
import { int, mins, pct, signed, siteName } from "@/lib/format";
import { minCurveK, validationText } from "@/lib/place";
import { MAX_TRUCKS_PER_STATION, MIN_TRUCKS_PER_STATION, type Q1VariantId } from "@/lib/state";

const VARIANT_OPTIONS: { value: Q1VariantId; label: string }[] = [
  { value: "capped_pmedian", label: "Fastest response" },
  { value: "fair", label: "Fair: one per fire centre" },
];

/** Number input for trucks per station. Keeps what is typed until it is a valid whole number. */
function TrucksInput({ value, onCommit }: { value: number; onCommit: (trucks: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id="trucks-per-station"
      type="number"
      inputMode="numeric"
      min={MIN_TRUCKS_PER_STATION}
      max={MAX_TRUCKS_PER_STATION}
      step={1}
      value={draft ?? String(value)}
      onChange={(event) => {
        const text = event.target.value;
        const trucks = Number(text);
        const whole = text !== "" && Number.isInteger(trucks);
        const inRange = trucks >= MIN_TRUCKS_PER_STATION && trucks <= MAX_TRUCKS_PER_STATION;
        if (whole) onCommit(trucks);
        // Out-of-range numbers are clamped by the reducer, so show the clamped value at once.
        setDraft(whole && !inRange ? null : text);
      }}
      onBlur={() => setDraft(null)}
      className="min-h-10 w-16 rounded-md border border-line-strong bg-field px-2 py-1.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
    />
  );
}

/** Change of a share from the optimized value, in percentage points. More is better. */
function shareDelta(live: number, optimized: number): StatDelta {
  return { text: signed(100 * (live - optimized), "pts"), better: live > optimized };
}

/** Sections 7.2 and 7.3: pick a variant and a number of stations, move stations, and see what the layout reaches. */
export function PlaceTab({ data }: { data: AppData }) {
  const { state, dispatch } = useAppState();
  const { q1, meta, evidence } = data;
  const variant = q1.variants[state.q1Variant];
  const threshold = meta.settings.threshold_min;
  const optimized = curvePoint(variant.curve, state.k);
  const { edited, live } = usePlaceLayout(data);
  // While edited, the cards and bars show the live score; otherwise the stored curve entry.
  const shown = live ?? optimized;
  const selected = state.selectedStation === null ? undefined : data.candidatesById.get(state.selectedStation);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Place stations</h2>
      <SegmentedControl
        label="How stations are chosen"
        options={VARIANT_OPTIONS}
        value={state.q1Variant}
        onChange={(value) => dispatch({ type: "setVariant", variant: value })}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="k-slider" className="flex justify-between text-[14px]">
          <span>Number of stations</span>
          <span className="font-mono font-medium text-station-text">K = {state.k}</span>
        </label>
        <input
          id="k-slider"
          type="range"
          min={minCurveK(q1, state.q1Variant)}
          max={q1.k_max}
          step={1}
          value={state.k}
          aria-valuetext={`${state.k} stations`}
          onChange={(event) => dispatch({ type: "setK", k: Number(event.target.value), kMax: q1.k_max })}
          className="min-h-8 w-full cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            size="md"
            tone="fire"
            value={pct(shown?.coverage)}
            label={`fire weight within ${threshold} min`}
            delta={live && optimized ? shareDelta(live.coverage, optimized.coverage) : undefined}
          />
          <StatCard
            size="md"
            value={pct(shown?.relative)}
            label="of the reachable ceiling"
            delta={live && optimized ? shareDelta(live.relative, optimized.relative) : undefined}
          />
          <StatCard
            size="md"
            value={mins(shown?.mean_min)}
            label="average response"
            delta={
              live && optimized
                ? { text: signed(live.mean_min - optimized.mean_min, "min"), better: live.mean_min < optimized.mean_min }
                : undefined
            }
          />
        </div>
        {edited ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] leading-[1.5] text-muted">
              Edited layout, re-scored live. Changes are against the optimized {state.k} stations.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "resetEdits" })}
              className="min-h-10 cursor-pointer rounded-md border border-line-strong px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station"
            >
              Reset to optimized
            </button>
          </div>
        ) : (
          <p className="text-[12px] leading-[1.5] text-muted">{validationText(evidence, state.q1Variant, state.k)}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[14px]">
        <label htmlFor="trucks-per-station">Trucks per station</label>
        <TrucksInput
          value={state.trucksPerStation}
          onCommit={(trucks) => dispatch({ type: "setTrucksPerStation", trucks })}
        />
        <span className="text-muted">
          = <span className="font-mono font-medium text-ink">{int(state.k * state.trucksPerStation)}</span> trucks in
          total
        </span>
      </div>

      <CoverageChart curve={variant.curve} dotAt={state.k} kMax={q1.k_max} ceiling={meta.ceiling.all_years} />

      {shown && <RegionBars byRegion={shown.by_region} />}

      <p role="status" className="border-t border-line pt-3 text-[13px] text-muted">
        {selected ? (
          <>
            Moving <span className="text-station-text">{siteName(selected)}</span>: click any site on the map to
            move it there, or press Escape to cancel.
          </>
        ) : (
          "Click a station, then any site on the map, to move it."
        )}
      </p>
    </div>
  );
}
