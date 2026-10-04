const TONE_CLASS = { ink: "text-ink", fire: "text-fire-text", station: "text-station-text" } as const;

interface StatCardProps {
  value: string;
  label: string;
  tone?: keyof typeof TONE_CLASS;
  /** "lg" for the two-column cards (22px number), "md" for three-column cards (20px). */
  size?: "md" | "lg";
}

/** A big monospace number with a small label under it. */
export function StatCard({ value, label, tone = "ink", size = "lg" }: StatCardProps) {
  return (
    <div className={`rounded-lg bg-card ${size === "lg" ? "p-3" : "p-2.5"}`}>
      <div className={`font-mono font-medium ${size === "lg" ? "text-[22px]" : "text-[20px]"} ${TONE_CLASS[tone]}`}>
        {value}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}
