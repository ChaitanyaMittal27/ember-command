const OVERLAY_CLASS = "absolute z-10 rounded-lg border border-line-strong bg-overlay px-3.5 py-2.5";

/** The map column. The real map (MapLibre + deck.gl) replaces the placeholder in step F3. */
export function MapArea() {
  return (
    <main
      aria-label="Map of British Columbia. The map is not loaded yet."
      className="relative flex h-[60vh] min-w-0 flex-[999_1_560px] items-center justify-center overflow-hidden bg-map wide:h-auto"
    >
      <div className={`${OVERLAY_CLASS} left-4 top-4 flex flex-col gap-0.5`}>
        <div className="text-[12px] uppercase tracking-[0.8px] text-muted">Current layout</div>
        <div className="text-[15px] text-ink-2">No layout loaded yet</div>
      </div>

      <p className="px-6 text-center text-[13px] text-faint">The map appears here in step F3.</p>

      <div className={`${OVERLAY_CLASS} bottom-4 left-4 flex flex-col gap-1.5 text-[13px]`}>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-fire" />
          Fire (size = early growth)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full border-[1.5px] border-fire" />
          Fire beyond reach of any site
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full border-2 border-ink bg-station" />
          Station, ring = 60-minute reach
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-[7px] bg-neutral" />
          Industrial heat source (excluded)
        </div>
      </div>
    </main>
  );
}
