import type { AppData } from "@/lib/data";

/** Section 7.8: where the data comes from and what the numbers leave out. */
export function AboutTab({ data }: { data: AppData }) {
  const { detour, speed_kmh, dispatch_min } = data.meta.settings;

  return (
    <div className="flex flex-col gap-2.5 text-[14px] leading-[1.55] text-ink-2">
      <h2 className="text-[18px] font-semibold text-ink">Data and limits</h2>
      <p>
        Fires: NASA FIRMS VIIRS 375 m active-fire detections (S-NPP; a 2022 outage filled from NOAA-20), grouped into
        fires. Industrial heat sources removed.
      </p>
      <p>
        Sites: OpenStreetMap towns and fire halls (©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        ).
      </p>
      <p>
        Travel time: straight-line distance × {detour} at {speed_kmh} km/h plus {dispatch_min} minutes to roll out.
        Remote areas look closer than they are by road.
      </p>
      <p>
        Fire halls are mostly municipal, not BC Wildfire Service bases. A fire counts as active for up to 14 days
        after detection.
      </p>
      <p>
        Method: facility location (greedy p-median and maximal coverage), validated on a held-out year.
      </p>
    </div>
  );
}
