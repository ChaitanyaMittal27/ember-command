const TONE_CLASS = { ink: "text-ink", fire: "text-fire-text", station: "text-station-text" } as const;

/** Change from the optimized value. `text` carries its own sign; null text means no change. */
export interface StatDelta {
  text: string | null;
  better: boolean;
}

interface StatCardProps {
  value: string;
  label: string;
  tone?: keyof typeof TONE_CLASS;
  /** "lg" for the two-column cards (22px number), "md" for three-column cards (20px). */
  size?: "md" | "lg";
  /** Shown under the label while the layout is edited. */
  delta?: StatDelta;
}

/** A big monospace number with a small label under it. */
export function StatCard({ value, label, tone = "ink", size = "lg", delta }: StatCardProps) {
  return (
    <div className={`rounded-lg bg-card ${size === "lg" ? "p-3" : "p-2.5"}`}>
      <div className={`font-mono font-medium ${size === "lg" ? "text-[22px]" : "text-[20px]"} ${TONE_CLASS[tone]}`}>
        {value}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
      {delta &&
        (delta.text ? (
          // Better and worse differ by sign and wording as well as colour.
          <div className={`mt-1 font-mono text-[12px] font-medium ${delta.better ? "text-station-text" : "text-fire-text"}`}>
            {delta.text}
            <span className="sr-only">{delta.better ? " (better than optimized)" : " (worse than optimized)"}</span>
          </div>
        ) : (
          <div className="mt-1 text-[12px] text-muted">no change</div>
        ))}
    </div>
  );
}
