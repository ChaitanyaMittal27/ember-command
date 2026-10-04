"use client";

import { Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { curvePoint } from "@/lib/curve";
import { pct } from "@/lib/format";
import type { CurvePoint } from "@/types/data";

/** A labelled vertical line at a number of stations. */
export interface ChartMarker {
  k: number;
  label: string;
  tone: "station" | "muted";
}

interface CoverageChartProps {
  curve: CurvePoint[];
  kMax: number;
  /** Coverage with every site open; drawn as a dashed horizontal line. */
  ceiling: number;
  /** A K to mark with a dot on the curve. */
  dotAt?: number;
  /** Vertical reference lines. */
  markers?: ChartMarker[];
}

const MARKER_COLOR = { station: "var(--color-station-text)", muted: "var(--color-muted)" } as const;

/** Coverage as stations are added, with the ceiling and chosen values of K marked. */
export function CoverageChart({ curve, kMax, ceiling, dotAt, markers = [] }: CoverageChartProps) {
  const dot = dotAt === undefined ? undefined : curvePoint(curve, dotAt);
  const first = curve.reduce((low, point) => (point.k < low.k ? point : low), curve[0]);
  const last = curve.reduce((high, point) => (point.k > high.k ? point : high), curve[0]);
  const top = Math.max(ceiling, last.coverage) * 1.12;
  const summary =
    `Coverage rises from ${pct(first.coverage)} at ${first.k} stations to ${pct(last.coverage)} at ${last.k}. ` +
    `The ceiling with every site open is ${pct(ceiling)}.` +
    (dot ? ` At ${dot.k} stations it is ${pct(dot.coverage)}.` : "") +
    markers.map((marker) => ` ${marker.label}: ${marker.k} stations.`).join("");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[13px] text-muted">Coverage as stations are added</div>
      <div role="img" aria-label={summary} className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 140 }}>
          <LineChart data={curve} margin={{ top: 6, right: 8, bottom: 2, left: 8 }}>
            <XAxis
              dataKey="k"
              type="number"
              domain={[0, kMax]}
              tick={false}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line-strong)" }}
              height={4}
            />
            <YAxis type="number" domain={[0, top]} hide />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: "var(--color-line-strong)" }}
              formatter={(value) => [pct(Number(value)), "fire weight covered"]}
              labelFormatter={(label) => `${label} stations`}
              contentStyle={{
                background: "var(--color-overlay)",
                border: "1px solid var(--color-line-strong)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-muted)" }}
              itemStyle={{ color: "var(--color-ink)" }}
            />
            <ReferenceLine y={ceiling} stroke="var(--color-neutral)" strokeDasharray="4 4" />
            {markers.map((marker) => (
              <ReferenceLine key={marker.label} x={marker.k} stroke={MARKER_COLOR[marker.tone]} strokeWidth={1} />
            ))}
            <Line
              dataKey="coverage"
              type="linear"
              stroke="var(--color-fire)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-fire)", stroke: "none" }}
              isAnimationActive={false}
            />
            {dot && (
              <ReferenceDot
                x={dot.k}
                y={dot.coverage}
                r={5}
                fill="var(--color-station)"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[11px] text-faint">
        <span>0</span>
        <span>dashed line: ceiling, every site open</span>
        <span>{kMax} stations</span>
      </div>
      {markers.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {markers.map((marker) => (
            <li key={marker.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-px"
                style={{ backgroundColor: MARKER_COLOR[marker.tone] }}
              />
              <span>
                <span className="font-mono font-medium" style={{ color: MARKER_COLOR[marker.tone] }}>
                  K = {marker.k}
                </span>{" "}
                {marker.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
