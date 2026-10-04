"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { int } from "@/lib/format";
import { axisDays, dayLabel, REGION_SERIES, type DailySeriesRow } from "@/lib/history";
import { REGIONS, type Region } from "@/types/data";

const seriesColor = (region: Region) => `var(--color-series-${REGION_SERIES[region]})`;

interface HistoryChartProps {
  series: DailySeriesRow[];
  totals: Record<Region, number>;
  start: string;
  end: string;
  /**
   * "compact" for the side panel: a small plot with the totals listed under it.
   * "large" for the pop-out view: fills its container, with a date axis and a legend.
   */
  size?: "compact" | "large";
}

/** Daily satellite detections, one line per fire centre. */
export function HistoryChart({ series, totals, start, end, size = "compact" }: HistoryChartProps) {
  const large = size === "large";
  const busiest = REGIONS.reduce((most, region) => (totals[region] > totals[most] ? region : most), REGIONS[0]);
  const summary =
    `Daily satellite detections from ${start} to ${end}, one line per fire centre. ` +
    `${busiest} has the most, ${int(totals[busiest])}.`;

  const plot = (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={0}
      initialDimension={{ width: large ? 900 : 320, height: large ? 420 : 170 }}
    >
      <LineChart data={series} margin={{ top: 6, right: large ? 16 : 8, bottom: 2, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-line)" />
        {large ? (
          <XAxis
            dataKey="day"
            ticks={axisDays(series.map((row) => row.day), 8)}
            tickFormatter={dayLabel}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line-strong)" }}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            height={28}
            tickMargin={8}
          />
        ) : (
          <XAxis dataKey="day" tick={false} tickLine={false} axisLine={{ stroke: "var(--color-line-strong)" }} height={4} />
        )}
        <YAxis
          width={large ? 56 : 44}
          tickCount={large ? 6 : 4}
          tickLine={false}
          axisLine={false}
          tick={{ fill: large ? "var(--color-muted)" : "var(--color-faint)", fontSize: large ? 12 : 11 }}
          tickFormatter={(value: number) => int(value)}
        />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--color-line-strong)" }}
          formatter={(value, name) => [int(Number(value)), String(name)]}
          labelFormatter={(label) => (large ? `${dayLabel(String(label))} (${label})` : String(label))}
          itemSorter={(item) => -Number(item.value)}
          contentStyle={{
            background: "var(--color-overlay)",
            border: "1px solid var(--color-line-strong)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-muted)" }}
          itemStyle={{ color: "var(--color-ink)" }}
        />
        {REGIONS.map((region) => (
          <Line
            key={region}
            dataKey={region}
            type="linear"
            stroke={seriesColor(region)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, stroke: "none" }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  if (large) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <div className="text-[14px] text-muted">Detections per day, by fire centre</div>
          <ul aria-label="Fire centres" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {REGIONS.map((region) => (
              <li key={region} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: seriesColor(region) }} />
                {region}
              </li>
            ))}
          </ul>
        </div>
        <div role="img" aria-label={summary} className="min-h-0 flex-1">
          {plot}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[13px] text-muted">Detections per day, by fire centre</div>
      <div role="img" aria-label={summary} className="h-[170px] w-full">
        {plot}
      </div>
      <div className="flex justify-between pl-11 text-[11px] text-faint">
        <span>{start}</span>
        <span>{end}</span>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <caption className="sr-only">Detections per fire centre over the range</caption>
        <tbody>
          {REGIONS.map((region) => (
            <tr key={region} className="border-b border-line last:border-b-0">
              <th scope="row" className="px-2 py-1 text-left font-normal">
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-0.5 w-4 rounded align-middle"
                  style={{ backgroundColor: seriesColor(region) }}
                />
                {region}
              </th>
              <td className="px-2 py-1 text-right font-mono font-medium">{int(totals[region])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
