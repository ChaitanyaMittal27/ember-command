import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  baselineBars,
  beatsRandomLine,
  fairnessLine,
  gapPoints,
  gapReachKm,
  mostUnreachableRegion,
  overloadLine,
  pmedianNote,
  weightLine,
} from "@/lib/evidence";
import { stationTooltip } from "@/lib/mapView";
import { REGIONS, type EvidenceFile, type GapsFile, type Meta } from "@/types/data";

function readExport<T>(fileName: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/data/${fileName}`, import.meta.url)), "utf8")) as T;
}

const gaps = readExport<GapsFile>("gaps.json");
const evidence = readExport<EvidenceFile>("evidence.json");
const meta = readExport<Meta>("meta.json");

describe("gaps", () => {
  it("names the fire centre with the most unreachable fires, from the data", () => {
    const most = mostUnreachableRegion(gaps);
    const count = (region: string) => gaps.by_region.find((row) => row.region === region)!.unreachable_fires;
    expect(gaps.by_region.every((row) => row.unreachable_fires <= count(most))).toBe(true);
    const swapped: GapsFile = {
      ...gaps,
      by_region: gaps.by_region.map((row) => (row.region === "Coastal" ? { ...row, unreachable_fires: 99999 } : row)),
    };
    expect(mostUnreachableRegion(swapped)).toBe("Coastal");
  });

  it("covers all six fire centres and adds up to the overall count", () => {
    expect(gaps.by_region.map((row) => row.region).sort()).toEqual([...REGIONS].sort());
    expect(gaps.by_region.reduce((total, row) => total + row.unreachable_fires, 0)).toBe(gaps.overall.unreachable_fires);
    expect(gaps.by_region.reduce((total, row) => total + row.fires, 0)).toBe(gaps.overall.fires);
  });

  it("the ring radius is the reach at the threshold the gaps are defined at", () => {
    expect(gaps.threshold_min).toBe(meta.settings.threshold_min);
    expect(gapReachKm(gaps, 0)).toBe(meta.settings.reach_km);
    expect(gapReachKm({ ...gaps, thresholds: [] }, 12.5)).toBe(12.5);
  });

  it("the ceiling at the gaps threshold is the all-years ceiling", () => {
    const row = gaps.thresholds.find((item) => item.threshold_min === gaps.threshold_min)!;
    expect(row.ceiling).toBe(meta.ceiling.all_years);
    expect(gaps.overall.unreachable_weight_share).toBeCloseTo(1 - row.ceiling, 4);
  });
});

describe("baseline bars", () => {
  it("lists the five layouts at K = 20 in the spec's order with its labels", () => {
    const bars = baselineBars(evidence, 20);
    expect(bars.map((bar) => bar.label)).toEqual([
      "Our layout",
      "Coverage-first layout",
      "Best of 1,000 random",
      "Typical random",
      "Biggest towns",
    ]);
    expect(bars.map((bar) => bar.ours)).toEqual([true, true, false, false, false]);
  });

  it("takes each value from the file and scales bars to the longest", () => {
    const bars = baselineBars(evidence, 20);
    const stored = (layout: string) => evidence.baselines.find((row) => row.k === 20 && row.layout === layout)!.test_relative;
    expect(bars[0].value).toBe(stored("capped_pmedian"));
    expect(bars[4].value).toBe(stored("most_populous_towns"));
    expect(Math.max(...bars.map((bar) => bar.width))).toBe(1);
    expect(bars[4].width).toBeCloseTo(stored("most_populous_towns") / Math.max(...bars.map((bar) => bar.value)), 10);
  });

  it("is empty for a K with no baselines", () => {
    expect(baselineBars(evidence, 21)).toEqual([]);
  });

  it("the beat-random line converts the stored fraction to a percentage", () => {
    expect(beatsRandomLine(evidence, 20)).toBe("Ours beat 100% of 1,000 random layouts.");
    expect(beatsRandomLine(evidence, 21)).toBeNull();
  });
});

describe("evidence lines", () => {
  it("gap_points stay in points and are not turned into a percentage", () => {
    expect(gapPoints(0.08)).toBe("0.08 pts");
    expect(gapPoints(0.4375)).toBe("0.44 pts");
    expect(gapPoints(0)).toBe("0.00 pts");
  });

  it("the p-median note reports the status, the variable count and the stored note", () => {
    expect(pmedianNote(evidence)).toBe(
      "The exact p-median could not be checked: with 956,524 variables it is too large to solve exactly in 120 s.",
    );
    const solved: EvidenceFile = {
      ...evidence,
      exact_check: { ...evidence.exact_check, pmedian: { status: "solved", variables: 1000, note: "solved to optimality" } },
    };
    expect(pmedianNote(solved)).toBe("The exact p-median (1,000 variables) was solved: solved to optimality.");
  });

  it("the fairness line compares the two methods at the smallest K", () => {
    expect(fairnessLine(evidence)).toBe(
      "Fairness: at 10 stations the fastest-response layout leaves Cariboo at 0.0% of its ceiling. Giving every fire " +
        "centre a station first lifts the worst-off centre (Southeast) to 16.0%, for −0.7 pts of overall coverage.",
    );
    expect(fairnessLine({ ...evidence, fairness: evidence.fairness.filter((row) => row.method === "fair") })).toBeNull();
  });

  it("the weight line quotes the overlap and both coverages", () => {
    expect(weightLine(evidence)).toBe(
      "Fire size: choosing 20 stations with every fire counted equally changes many of the sites (overlap 0.33) " +
        "but barely moves coverage (37.7% weighted, 36.7% unweighted).",
    );
  });

  it("the overload line follows the spec's sentence", () => {
    expect(overloadLine(evidence)).toBe(
      "Trucks: in 2023, 1.2% of station-days had more fires than trucks; the worst station peaked at 11 fires " +
        "against 2 trucks.",
    );
  });
});

describe("site tooltip outside editing", () => {
  it("a site on the Gaps map shows just its name, kind and fire centre", () => {
    const site = { cand_id: 9, name: null, kind: "town" as const, region: "Northwest" as const, lat: 55, lon: -127, population: null };
    expect(stationTooltip(site)).toBe("Unnamed place\nTown · Northwest fire centre");
  });
});
