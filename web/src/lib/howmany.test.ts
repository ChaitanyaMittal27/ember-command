import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { curvePoint } from "@/lib/curve";
import { sortStations, stationLoadNote, truckRadii, truckRadius } from "@/lib/howmany";
import { stationTooltip } from "@/lib/mapView";
import { appReducer, initialState } from "@/lib/state";
import { REGIONS, type Q2File, type Q2Station } from "@/types/data";

const q2 = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../public/data/q2_coverage.json", import.meta.url)), "utf8"),
) as Q2File;

function station(overrides: Partial<Q2Station>): Q2Station {
  return { cand_id: 1, k: 1, trucks: 1, fires_covered: 10, peak_active: 2, ...overrides };
}

describe("sortStations", () => {
  it("puts the most trucks first, then the pick order", () => {
    const sorted = sortStations([
      station({ cand_id: 10, k: 1, trucks: 2 }),
      station({ cand_id: 11, k: 2, trucks: 5 }),
      station({ cand_id: 12, k: 3, trucks: 2 }),
      station({ cand_id: 13, k: 4, trucks: 5 }),
    ]);
    expect(sorted.map((item) => item.cand_id)).toEqual([11, 13, 10, 12]);
  });

  it("does not reorder the stored array", () => {
    const before = q2.stations.map((item) => item.cand_id);
    const sorted = sortStations(q2.stations);
    expect(q2.stations.map((item) => item.cand_id)).toEqual(before);
    expect(sorted).toHaveLength(q2.stations.length);
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      expect(a.trucks > b.trucks || (a.trucks === b.trucks && a.k < b.k)).toBe(true);
    }
  });
});

describe("station size by trucks", () => {
  it("runs from an 11px dot for the fewest trucks to a 19px dot for the most", () => {
    expect(truckRadius(1, 1, 8)).toBe(5.5);
    expect(truckRadius(8, 1, 8)).toBe(9.5);
    expect(truckRadius(4.5, 1, 8)).toBe(7.5);
  });

  it("stays in range for values outside it, and when every station has the same trucks", () => {
    expect(truckRadius(0, 1, 8)).toBe(5.5);
    expect(truckRadius(20, 1, 8)).toBe(9.5);
    expect(truckRadius(3, 3, 3)).toBe(5.5);
  });

  it("gives every Q2 station a radius between 5.5 and 9.5", () => {
    const radii = truckRadii(q2.stations);
    expect(radii.size).toBe(q2.stations.length);
    expect(Math.min(...radii.values())).toBe(5.5);
    expect(Math.max(...radii.values())).toBe(9.5);
  });
});

describe("tooltips", () => {
  it("the load note gives trucks, fires covered and the peak, with singulars", () => {
    expect(stationLoadNote(station({ trucks: 3, fires_covered: 41, peak_active: 6 }))).toBe(
      "3 trucks · 41 fires covered · up to 6 at once",
    );
    expect(stationLoadNote(station({ trucks: 1, fires_covered: 1, peak_active: 1 }))).toBe(
      "1 truck · 1 fire covered · up to 1 at once",
    );
  });

  it("a station tooltip can carry the note as a third line", () => {
    const lytton = { cand_id: 1, name: "Lytton", kind: "town" as const, region: "Kamloops" as const, lat: 50, lon: -121, population: null };
    expect(stationTooltip(lytton, "2 trucks")).toBe("Lytton\nTown · Kamloops fire centre\n2 trucks");
    expect(stationTooltip(lytton).split("\n")).toHaveLength(2);
  });
});

describe("Q2 file as the How many tab uses it", () => {
  it("the stations are the first k_star picks and their trucks add up", () => {
    expect(q2.k_star).not.toBeNull();
    expect(q2.stations.map((item) => item.cand_id)).toEqual(q2.picks.slice(0, q2.k_star!));
    expect(q2.stations.reduce((total, item) => total + item.trucks, 0)).toBe(q2.total_trucks);
  });

  it("the curve has an entry at k_star and at the elbow, and the regions add up", () => {
    expect(curvePoint(q2.curve, q2.k_star!)?.relative).toBeGreaterThanOrEqual(q2.target_relative);
    expect(curvePoint(q2.curve, q2.elbow_k)).toBeDefined();
    const regions = q2.by_region_at_k_star!;
    expect(REGIONS.reduce((total, region) => total + regions[region].stations, 0)).toBe(q2.k_star);
    expect(REGIONS.reduce((total, region) => total + regions[region].trucks, 0)).toBe(q2.total_trucks);
  });
});

describe("hovered station", () => {
  it("is set and cleared, and is dropped when the tab changes", () => {
    const hovered = appReducer(initialState, { type: "hoverStation", candId: 42 });
    expect(hovered.hoveredStation).toBe(42);
    expect(appReducer(hovered, { type: "hoverStation", candId: 42 })).toBe(hovered);
    expect(appReducer(hovered, { type: "hoverStation", candId: null }).hoveredStation).toBeNull();
    expect(appReducer(hovered, { type: "setTab", tab: "halls" }).hoveredStation).toBeNull();
  });
});
