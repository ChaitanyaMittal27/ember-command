import { StatCard } from "@/components/StatCard";
import { ROW, TABLE, TD_LABEL, TD_NUMBER, TH, TH_NUMBER } from "@/components/tableStyles";
import type { AppData } from "@/lib/data";
import { mostUnreachableRegion } from "@/lib/evidence";
import { int, pct } from "@/lib/format";

/** Section 7.6: the fires no site can reach in time, and how that changes with the time allowed. */
export function GapsTab({ data }: { data: AppData }) {
  const { gaps } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold">Where trucks can&apos;t reach</h2>
        <p className="text-[14px] leading-[1.55] text-ink-2">
          {pct(gaps.overall.unreachable_weight_share)} of fire weight is more than {gaps.threshold_min} minutes by
          road from every town and fire hall in BC. {mostUnreachableRegion(gaps)} holds most of it. This is air-attack
          territory.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {gaps.thresholds.map((row) => (
          <StatCard
            key={row.threshold_min}
            size="md"
            tone={row.threshold_min === gaps.threshold_min ? "fire" : "ink"}
            value={pct(row.ceiling)}
            label={`reachable in ${row.threshold_min} min`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] text-muted">By fire centre, at {gaps.threshold_min} minutes</div>
        <table className={TABLE}>
          <thead>
            <tr className={ROW}>
              <th scope="col" className={TH}>
                Fire centre
              </th>
              <th scope="col" className={TH_NUMBER}>
                Fires
              </th>
              <th scope="col" className={TH_NUMBER}>
                Unreachable
              </th>
              <th scope="col" className={TH_NUMBER}>
                Weight unreachable
              </th>
            </tr>
          </thead>
          <tbody>
            {gaps.by_region.map((row) => (
              <tr key={row.region} className={ROW}>
                <th scope="row" className={TD_LABEL}>
                  {row.region}
                </th>
                <td className={TD_NUMBER}>{int(row.fires)}</td>
                <td className={TD_NUMBER}>{int(row.unreachable_fires)}</td>
                <td className={TD_NUMBER}>{pct(row.unreachable_weight_share)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className={TD_LABEL}>
                All of BC
              </th>
              <td className={TD_NUMBER}>{int(gaps.overall.fires)}</td>
              <td className={TD_NUMBER}>{int(gaps.overall.unreachable_fires)}</td>
              <td className={TD_NUMBER}>{pct(gaps.overall.unreachable_weight_share)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-[1.5] text-faint">
        On the map, every possible site is open and each ring is its {gaps.threshold_min}-minute reach. The hollow
        fires are those beyond {gaps.threshold_min} minutes of every site.
      </p>
    </div>
  );
}
