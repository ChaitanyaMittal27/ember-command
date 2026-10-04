import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { curvePoint } from "@/lib/curve";
import { stationTooltip } from "@/lib/mapView";
import { minCurveK, q1Layout, validationText } from "@/lib/place";
import { FAIR_MIN_K } from "@/lib/state";
import { REGIONS, type EvidenceFile, type Q1File } from "@/types/data";

function readExport<T>(fileName: string): T {
  const path = fileURLToPath(new URL(`../../public/data/${fileName}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const q1 = readExport<Q1File>("q1_layouts.json");
const evidence = readExport<EvidenceFile>("evidence.json");

describe("q1Layout", () => {
  it("is the first K picks, in pick order", () => {
    expect(q1Layout(q1, "capped_pmedian", 3)).toEqual(q1.variants.capped_pmedian.picks.slice(0, 3));
    expect(q1Layout(q1, "capped_pmedian", q1.k_max)).toHaveLength(q1.k_max);
    expect(new Set(q1Layout(q1, "fair", 40)).size).toBe(40);
  });

  it("the fair layout starts with its six region seeds", () => {
    expect(q1Layout(q1, "fair", 6)).toEqual(q1.variants.fair.seeds);
  });

  it("the layout at K ends with the site the curve says was added at K", () => {
    for (const variant of ["capped_pmedian", "fair"] as const) {
      for (const k of [6, 20, 60]) {
        expect(q1Layout(q1, variant, k).at(-1)).toBe(curvePoint(q1.variants[variant].curve, k)?.site);
      }
    }
  });
});

describe("minCurveK", () => {
  it("is 1 for capped p-median and 6 for fair, matching the reducer", () => {
    expect(minCurveK(q1, "capped_pmedian")).toBe(1);
    expect(minCurveK(q1, "fair")).toBe(FAIR_MIN_K);
  });
});

describe("curve entries used by the Place tab", () => {
  it("every K on both curves has a score for all six fire centres", () => {
    for (const variant of [q1.variants.capped_pmedian, q1.variants.fair]) {
      for (const point of variant.curve) {
        expect(Object.keys(point.by_region).sort()).toEqual([...REGIONS].sort());
      }
    }
  });
});

describe("validationText", () => {
  it("quotes the 2023 result for capped p-median at K = 10, 20, 40 and 60", () => {
    for (const k of [10, 20, 40, 60]) {
      const row = evidence.q1_variants.find((item) => item.variant === "capped_pmedian" && item.k === k);
      expect(row).toBeDefined();
      expect(validationText(evidence, "capped_pmedian", k)).toBe(
        `Chosen on 2019–2022 fires, this layout reached ${(100 * row!.test_relative).toFixed(1)}% of the 2023 ceiling.`,
      );
    }
    expect(validationText(evidence, "capped_pmedian", 20)).toContain("37.8%");
  });

  it("points to About at every other K", () => {
    const fallback = "Tested on unseen 2023 fires at K = 10, 20, 40 and 60 (see About).";
    expect(validationText(evidence, "capped_pmedian", 19)).toBe(fallback);
    expect(validationText(evidence, "capped_pmedian", 21)).toBe(fallback);
  });

  it("never quotes a test result for the fair variant, which was not tested", () => {
    expect(validationText(evidence, "fair", 20)).toBe(
      "Tested on unseen 2023 fires at K = 10, 20, 40 and 60 (see About).",
    );
  });
});

describe("stationTooltip", () => {
  it("shows name, kind and fire centre", () => {
    const base = { cand_id: 1, lat: 50, lon: -121, population: null };
    expect(stationTooltip({ ...base, name: "Lytton", kind: "town", region: "Kamloops" })).toBe(
      "Lytton\nTown · Kamloops fire centre",
    );
    expect(stationTooltip({ ...base, name: null, kind: "hall", region: "Coastal" })).toBe(
      "Unnamed fire hall\nExisting fire hall · Coastal fire centre",
    );
  });
});
