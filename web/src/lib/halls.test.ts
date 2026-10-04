import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DATA_FILES, withLookups, type DataFiles } from "@/lib/data";
import {
  gainText,
  hallMarkers,
  hallsCoveringNoFire,
  hallSize,
  hallTrucks,
  hallTruckTotal,
  matchingHeadline,
  nextMarkers,
} from "@/lib/halls";
import { appReducer, initialState } from "@/lib/state";

function readExport(fileName: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/data/${fileName}`, import.meta.url)), "utf8"));
}

const data = withLookups(
  Object.fromEntries(Object.entries(DATA_FILES).map(([key, file]) => [key, readExport(file)])) as unknown as DataFiles,
);
const { q3 } = data;

describe("hall trucks", () => {
  it("each mode reads its own field and adds up to the file's total", () => {
    for (const mode of ["need", "2x"] as const) {
      const sum = q3.halls.reduce((total, hall) => total + hallTrucks(hall, mode), 0);
      expect(sum).toBe(hallTruckTotal(q3, mode));
    }
    expect(hallTruckTotal(q3, "need")).toBe(q3.trucks.need_total);
    expect(hallTruckTotal(q3, "2x")).toBe(q3.trucks.budget_2x);
    expect(q3.trucks.budget_2x).toBe(2 * q3.halls.length);
  });

  it("counts the halls that cover no fire", () => {
    const count = hallsCoveringNoFire(q3);
    expect(count).toBe(q3.halls.filter((hall) => hall.fires_covered === 0).length);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(q3.halls.length);
  });

  it("the truck mode switches and nothing else changes", () => {
    const next = appReducer(initialState, { type: "setHallTruckMode", mode: "2x" });
    expect(next).toEqual({ ...initialState, hallTruckMode: "2x" });
  });
});

describe("hall size", () => {
  it("runs from 8px for the fewest trucks to 16px for the most", () => {
    expect(hallSize(1, 1, 4)).toBe(8);
    expect(hallSize(4, 1, 4)).toBe(16);
    expect(hallSize(2.5, 1, 4)).toBe(12);
    expect(hallSize(9, 1, 4)).toBe(16);
    expect(hallSize(2, 2, 2)).toBe(8);
  });

  it("every hall gets a marker between 8 and 16px in both modes", () => {
    for (const mode of ["need", "2x"] as const) {
      const markers = hallMarkers(q3, data.candidatesById, mode);
      expect(markers).toHaveLength(q3.halls.length);
      expect(Math.min(...markers.map((marker) => marker.size))).toBe(8);
      expect(Math.max(...markers.map((marker) => marker.size))).toBe(16);
      expect(markers.every((marker) => marker.candidate.kind === "hall")).toBe(true);
    }
  });

  it("the two modes size at least some halls differently", () => {
    const need = hallMarkers(q3, data.candidatesById, "need");
    const budget = hallMarkers(q3, data.candidatesById, "2x");
    expect(need.some((marker, index) => marker.size !== budget[index].size)).toBe(true);
  });

  it("a hall's tooltip names its trucks in the chosen mode", () => {
    const hall = q3.halls.find((item) => item.trucks_need !== item.trucks_2x && item.fires_covered > 1)!;
    const index = q3.halls.indexOf(hall);
    expect(hallMarkers(q3, data.candidatesById, "need")[index].tooltip).toContain(
      `${hall.trucks_need} ${hall.trucks_need === 1 ? "truck" : "trucks"} (by load) · ${hall.fires_covered} fires covered`,
    );
    expect(hallMarkers(q3, data.candidatesById, "2x")[index].tooltip).toContain(
      `${hall.trucks_2x} ${hall.trucks_2x === 1 ? "truck" : "trucks"} (from 2 per hall)`,
    );
  });
});

describe("next stations", () => {
  it("shows a gain stored as a fraction in percentage points", () => {
    expect(gainText(0.0138)).toBe("+1.38 pts");
    expect(gainText(0.0007)).toBe("+0.07 pts");
    expect(gainText(0)).toBe("+0.00 pts");
  });

  it("markers follow the stored ranks and none is an existing hall", () => {
    const markers = nextMarkers(q3, data.candidatesById);
    expect(markers.map((marker) => marker.rank)).toEqual(q3.next_stations.map((next) => next.rank));
    expect(markers.map((marker) => marker.rank)).toEqual(Array.from({ length: markers.length }, (_, i) => i + 1));
    const hallIds = new Set(data.hallIds);
    expect(markers.every((marker) => !hallIds.has(marker.candidate.cand_id))).toBe(true);
    expect(markers[0].tooltip).toContain(`Next station 1 of ${markers.length} · ${gainText(q3.next_stations[0].gain)}`);
  });

  it("each gain is the step in coverage_after", () => {
    let before = q3.score.coverage;
    for (const next of q3.next_stations) {
      expect(Math.abs(next.coverage_after - before - next.gain)).toBeLessThanOrEqual(0.00011);
      before = next.coverage_after;
    }
  });
});

describe("headline", () => {
  it("quotes the matching K, the hall count and the 2023 comparison from evidence", () => {
    const headline = matchingHeadline(q3, data.meta, data.evidence)!;
    expect(headline.k).toBe(q3.matching!.k);
    expect(headline.halls).toBe(q3.halls.length);
    expect(headline.detail).toBe(
      "Over 2019–2023. Fitted on 2019–2022 only, the dense hall network held up better on 2023 " +
        `(${(100 * data.evidence.q3_split.halls_test).toFixed(1)}% vs ${(100 * data.evidence.q3_split.optimized_test).toFixed(1)}%) ` +
        "because the fires moved north.",
    );
  });

  it("is null when no optimized layout matches the halls", () => {
    expect(matchingHeadline({ ...q3, matching: null }, data.meta, data.evidence)).toBeNull();
  });
});
