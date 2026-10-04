import { describe, expect, it } from "vitest";
import {
  clampView,
  filterFires,
  FIRE_MAX_RADIUS_PX,
  FIRE_MIN_RADIUS_PX,
  fireOpacity,
  fireRadiusMeters,
  fireTooltip,
  INITIAL_VIEW,
  MAX_BOUNDS,
  MAX_ZOOM,
  MIN_ZOOM,
  ringOpacity,
  showsIndustrialSources,
  staticFireTooltip,
} from "@/lib/mapView";
import { hexToRgb } from "@/lib/theme";
import type { Fire } from "@/types/data";

function fire(overrides: Partial<Fire>): Fire {
  return {
    fire_id: "2021-00001",
    year: 2021,
    date: "2021-07-03",
    lat: 50.2,
    lon: -121.6,
    weight: 7,
    active_days: 4,
    region: "Kamloops",
    nearest_min: 38.6,
    reachable: true,
    ...overrides,
  };
}

const FIRES = [
  fire({ fire_id: "a", year: 2021, region: "Kamloops" }),
  fire({ fire_id: "b", year: 2023, region: "Kamloops" }),
  fire({ fire_id: "c", year: 2023, region: "Prince George", reachable: false, nearest_min: 141.2 }),
  fire({ fire_id: "d", year: 2019, region: "Coastal" }),
];

describe("filterFires", () => {
  const ids = (fires: Fire[]) => fires.map((item) => item.fire_id).join("");

  it("returns every fire when no filter is set", () => {
    expect(filterFires(FIRES, "all", "all")).toBe(FIRES);
  });

  it("filters by year, by region, and by both", () => {
    expect(ids(filterFires(FIRES, 2023, "all"))).toBe("bc");
    expect(ids(filterFires(FIRES, "all", "Kamloops"))).toBe("ab");
    expect(ids(filterFires(FIRES, 2023, "Kamloops"))).toBe("b");
    expect(ids(filterFires(FIRES, 2020, "all"))).toBe("");
  });
});

describe("fire dots", () => {
  it("radius is 700 + weight x 120 metres, kept between 1 and 6 pixels on screen", () => {
    expect(fireRadiusMeters({ weight: 1 })).toBe(820);
    expect(fireRadiusMeters({ weight: 16 })).toBe(2620);
    expect([FIRE_MIN_RADIUS_PX, FIRE_MAX_RADIUS_PX]).toEqual([1, 6]);
  });

  it("opacity follows the tab", () => {
    expect(fireOpacity("overview", true)).toBe(0.85);
    expect(fireOpacity("overview", false)).toBe(1);
    expect(fireOpacity("gaps", true)).toBe(0.25);
    expect(fireOpacity("gaps", false)).toBe(1);
    expect(fireOpacity("about", true)).toBe(0.5);
    expect(fireOpacity("about", false)).toBe(0.5);
  });

  it("fires are dimmed under a layout: 40% reachable, 55% unreachable", () => {
    for (const tab of ["place", "howmany", "halls"] as const) {
      expect(fireOpacity(tab, true)).toBe(0.4);
      expect(fireOpacity(tab, false)).toBe(0.55);
    }
  });

  it("reach rings are lighter on Gaps only", () => {
    expect(ringOpacity("gaps")).toEqual({ fill: 0.04, stroke: 0.3 });
    expect(ringOpacity("place")).toEqual({ fill: 0.1, stroke: 0.55 });
    expect(ringOpacity("howmany")).toEqual({ fill: 0.1, stroke: 0.55 });
  });

  it("industrial sources are hidden on About and History only", () => {
    expect(showsIndustrialSources("place")).toBe(true);
    expect(showsIndustrialSources("gaps")).toBe(true);
    expect(showsIndustrialSources("history")).toBe(false);
    expect(showsIndustrialSources("about")).toBe(false);
  });
});

describe("tooltips", () => {
  it("a fire shows id, date, region, weight and nearest minutes", () => {
    expect(fireTooltip(FIRES[0], 60)).toBe(
      "Fire a\n2021-07-03 · Kamloops\nWeight 7 (early growth)\n39 min from the nearest possible site",
    );
  });

  it("an unreachable fire says so in words, not only by its look", () => {
    expect(fireTooltip(FIRES[2], 60)).toContain("Beyond 60 min of every site (nearest: 141 min)");
  });

  it("an industrial source is labelled as excluded", () => {
    expect(staticFireTooltip({ fire_id: "2020-00087", year: 2020, lat: 56.1, lon: -120.7 })).toBe(
      "Industrial heat source 2020-00087\nDetected 2020 · excluded from scoring",
    );
  });
});

describe("clampView", () => {
  it("leaves the initial view alone", () => {
    expect(clampView(INITIAL_VIEW)).toEqual(INITIAL_VIEW);
    expect(INITIAL_VIEW).toMatchObject({ longitude: -125, latitude: 54.5, zoom: 4.6, pitch: 0 });
  });

  it("keeps the centre inside the bounds and the zoom in range, and stays flat", () => {
    const far = clampView({ longitude: -170, latitude: 80, zoom: 1, pitch: 40, bearing: 30 });
    expect(far).toEqual({ longitude: MAX_BOUNDS.west, latitude: MAX_BOUNDS.north, zoom: MIN_ZOOM, pitch: 0, bearing: 0 });
    const near = clampView({ longitude: -90, latitude: 30, zoom: 20, pitch: 0, bearing: 0 });
    expect(near).toMatchObject({ longitude: MAX_BOUNDS.east, latitude: MAX_BOUNDS.south, zoom: MAX_ZOOM });
  });
});

describe("hexToRgb", () => {
  it("parses six- and three-digit hex colours", () => {
    expect(hexToRgb("#f08a24")).toEqual([240, 138, 36]);
    expect(hexToRgb(" #5AA9E6 ")).toEqual([90, 169, 230]);
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects anything else", () => {
    expect(() => hexToRgb("rgb(1, 2, 3)")).toThrow("Not a hex colour");
    expect(() => hexToRgb("")).toThrow("Not a hex colour");
  });
});
