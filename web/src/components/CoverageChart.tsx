"use client";

import { Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { curvePoint } from "@/lib/curve";
import { pct } from "@/lib/format";
import type { CurvePoint } from "@/types/data";

interface CoverageChartProps {
  curve: CurvePoint[];
  /** The K currently selected; marked with a dot. */
  k: number;
  kMax: number;
  /** Coverage with every site open; drawn as a dashed line. */
  ceiling: number;
}

/** Coverage as stations are added, with the ceiling and the current K marked. */
export function CoverageChart({ curve, k, kMax, ceiling }: CoverageChartProps) {
  const current = curvePoint(curve, k);
  const first = curve.reduce((low, point) => (point.k < low.k ? point : low), curve[0]);
  const last = curve.reduce((high, point) => (point.k > high.k ? point : high), curve[0]);
  const top = Math.max(ceiling, last.coverage) * 1.12;
  const summary =
    `Coverage rises from ${pct(first.coverage)} at ${first.k} stations to ${pct(last.coverage)} at ${last.k}. ` +
    `The ceiling with every site open is ${pct(ceiling)}.` +
    (current ? ` At ${k} stations it is ${pct(current.coverage)}.` : "");

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
            <Line
              dataKey="coverage"
              type="linear"
              stroke="var(--color-fire)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-fire)", stroke: "none" }}
              isAnimationActive={false}
            />
            {current && (
              <ReferenceDot
                x={current.k}
                y={current.coverage}
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
    </div>
  );
}
