interface SegmentedControlProps<T extends string | number> {
  /** Names the group for screen readers. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of buttons where exactly one is selected. */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 rounded-lg bg-card p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={
              "min-h-10 flex-1 cursor-pointer rounded-md px-2 text-[13px] " +
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-station " +
              (selected ? "bg-station-bg text-ink outline outline-1 outline-station" : "text-muted")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
