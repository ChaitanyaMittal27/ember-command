"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { int } from "@/lib/format";
import { REGION_SERIES, type DailySeriesRow } from "@/lib/history";
import { REGIONS, type Region } from "@/types/data";

const seriesColor = (region: Region) => `var(--color-series-${REGION_SERIES[region]})`;

interface HistoryChartProps {
  series: DailySeriesRow[];
  totals: Record<Region, number>;
  start: string;
  end: string;
}

/** Daily satellite detections, one line per fire centre, with a legend that doubles as a totals table. */
export function HistoryChart({ series, totals, start, end }: HistoryChartProps) {
  const busiest = REGIONS.reduce((most, region) => (totals[region] > totals[most] ? region : most), REGIONS[0]);
  const summary =
    `Daily satellite detections from ${start} to ${end}, one line per fire centre. ` +
    `${busiest} has the most, ${int(totals[busiest])}.`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[13px] text-muted">Detections per day, by fire centre</div>
      <div role="img" aria-label={summary} className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 170 }}>
          <LineChart data={series} margin={{ top: 6, right: 8, bottom: 2, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="day" tick={false} tickLine={false} axisLine={{ stroke: "var(--color-line-strong)" }} height={4} />
            <YAxis
              width={44}
              tickCount={4}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-faint)", fontSize: 11 }}
              tickFormatter={(value: number) => int(value)}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: "var(--color-line-strong)" }}
              formatter={(value, name) => [int(Number(value)), String(name)]}
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
