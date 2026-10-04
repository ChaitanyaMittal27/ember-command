import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { curvePoint } from "@/lib/curve";
import { withLookups, type DataFiles, DATA_FILES } from "@/lib/data";
import { replaceStation, scoreLive } from "@/lib/edit";
import { q1Layout } from "@/lib/place";
import { appReducer, initialState } from "@/lib/state";
import { REGIONS } from "@/types/data";

function readExport(fileName: string): unknown {
  const path = fileURLToPath(new URL(`../../public/data/${fileName}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

const data = withLookups(
  Object.fromEntries(Object.entries(DATA_FILES).map(([key, file]) => [key, readExport(file)])) as unknown as DataFiles,
);

describe("replaceStation", () => {
  it("moves a station to a new site and keeps its place in the list", () => {
    expect(replaceStation([5, 9, 12], 9, 40)).toEqual([5, 40, 12]);
  });

  it("does nothing when the target site is already a station", () => {
    const layout = [5, 9, 12];
    expect(replaceStation(layout, 9, 12)).toBe(layout);
    expect(replaceStation(layout, 9, 9)).toBe(layout);
  });

  it("does nothing when the station to move is not in the layout", () => {
    const layout = [5, 9, 12];
    expect(replaceStation(layout, 77, 40)).toBe(layout);
  });

  it("does not change the original array", () => {
    const layout = [5, 9, 12];
    replaceStation(layout, 9, 40);
    expect(layout).toEqual([5, 9, 12]);
  });

  it("never creates duplicates or changes the number of stations, whatever is clicked", () => {
    // A deterministic walk: 2,000 moves over a real 20-station layout, including clicks on open sites.
    let layout = q1Layout(data.q1, "capped_pmedian", 20);
    const sites = data.candidates.candidates.length;
    let seed = 12345;
    const next = (limit: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed % limit;
    };
    let moved = 0;
    for (let step = 0; step < 2000; step++) {
      const from = step % 7 === 0 ? next(sites) : layout[next(layout.length)];
      const to = step % 5 === 0 ? layout[next(layout.length)] : next(sites);
      const after = replaceStation(layout, from, to);
      if (after !== layout) moved++;
      layout = after;
      expect(layout).toHaveLength(20);
      expect(new Set(layout).size).toBe(20);
    }
    expect(moved).toBeGreaterThan(1000);
  });
});

describe("scoreLive", () => {
  const variant = data.q1.variants.capped_pmedian;
  const layout = q1Layout(data.q1, "capped_pmedian", 20);
  const stored = curvePoint(variant.curve, 20)!;

  it("matches the stored numbers for an unedited layout, overall and per fire centre", () => {
    const live = scoreLive(data, layout)!;
    expect(Math.abs(live.coverage - stored.coverage)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(live.relative - stored.relative)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(live.mean_min - stored.mean_min)).toBeLessThanOrEqual(0.1);
    for (const region of REGIONS) {
      expect(Math.abs(live.by_region[region].coverage - stored.by_region[region].coverage)).toBeLessThanOrEqual(0.0001);
      expect(Math.abs(live.by_region[region].relative - stored.by_region[region].relative)).toBeLessThanOrEqual(0.0002);
    }
  });

  it("does not depend on the order of the stations", () => {
    const live = scoreLive(data, layout)!;
    const reversed = scoreLive(data, [...layout].reverse())!;
    expect(reversed.coverage).toBe(live.coverage);
    expect(reversed.mean_min).toBeCloseTo(live.mean_min, 9);
  });

  it("changes when a station moves, and comes back when it moves back", () => {
    const before = scoreLive(data, layout)!;
    const elsewhere = data.candidates.candidates.find((candidate) => !layout.includes(candidate.cand_id))!;
    const edited = replaceStation(layout, layout[0], elsewhere.cand_id);
    const during = scoreLive(data, edited)!;
    expect(during.mean_min).not.toBe(before.mean_min);
    const restored = scoreLive(data, replaceStation(edited, elsewhere.cand_id, layout[0]))!;
    expect(restored.coverage).toBe(before.coverage);
    expect(restored.mean_min).toBeCloseTo(before.mean_min, 9);
  });

  it("returns null instead of throwing for an empty or unknown layout", () => {
    expect(scoreLive(data, [])).toBeNull();
    expect(scoreLive(data, [999999])).toBeNull();
  });
});

describe("edit state", () => {
  it("an edit stores the layout and the newly selected station; reset clears both", () => {
    const edited = appReducer(initialState, { type: "setEditedLayout", layout: [1, 2, 3], selected: 3 });
    expect(edited).toMatchObject({ editedLayout: [1, 2, 3], selectedStation: 3 });
    expect(appReducer(edited, { type: "resetEdits" })).toMatchObject({ editedLayout: null, selectedStation: null });
  });

  it("deselecting keeps the edited layout", () => {
    const edited = appReducer(initialState, { type: "setEditedLayout", layout: [1, 2, 3], selected: 3 });
    expect(appReducer(edited, { type: "selectStation", candId: null })).toMatchObject({
      editedLayout: [1, 2, 3],
      selectedStation: null,
    });
  });
});
