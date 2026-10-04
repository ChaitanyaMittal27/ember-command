import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { curvePoint } from "@/lib/curve";
import { checkSchemaVersion, DATA_FILES, loadData, type DataFiles, type Fetcher } from "@/lib/data";
import { REGIONS, scoreLayout } from "@/types/data";

/** Reads a real exported file from web/public/data/. */
function readExport(fileName: string): unknown {
  const path = fileURLToPath(new URL(`../../public/data/${fileName}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

/** A fetch stand-in that serves the real files, with optional overrides per file name. */
function fakeFetch(overrides: Record<string, { status?: number; body?: unknown }> = {}): Fetcher {
  return async (url) => {
    const fileName = url.replace("/data/", "");
    const override = overrides[fileName];
    const status = override?.status ?? 200;
    return {
      ok: status === 200,
      status,
      json: async () => (override && "body" in override ? override.body : readExport(fileName)),
    };
  };
}

describe("schema version check", () => {
  it("accepts the version this app was built for", () => {
    expect(() => checkSchemaVersion("meta.json", { schema_version: 1 })).not.toThrow();
  });

  it("rejects a wrong or missing version with a readable message", () => {
    expect(() => checkSchemaVersion("meta.json", { schema_version: 2 })).toThrow(
      "meta.json has schema_version 2, but this app needs 1",
    );
    expect(() => checkSchemaVersion("fires.json", {})).toThrow("fires.json has schema_version null");
    expect(() => checkSchemaVersion("fires.json", null)).toThrow("fires.json has schema_version null");
  });
});

describe("loadData", () => {
  it("loads all nine files and builds the lookups", async () => {
    const data = await loadData(fakeFetch());
    expect(Object.keys(DATA_FILES)).toHaveLength(9);
    expect(data.fires.fires).toHaveLength(data.meta.counts.fires);
    expect(data.candidatesById.size).toBe(data.meta.counts.candidates);
    expect(data.candidatesById.get(0)?.cand_id).toBe(0);
    expect(data.hallIds).toHaveLength(data.meta.counts.halls);
    expect(data.hallIds.every((id) => data.candidatesById.get(id)?.kind === "hall")).toBe(true);
    expect(Object.keys(data.firesByRegion).sort()).toEqual([...REGIONS].sort());
    const grouped = REGIONS.reduce((total, region) => total + data.firesByRegion[region].length, 0);
    expect(grouped).toBe(data.meta.counts.fires);
    expect(data.firesByRegion.Kamloops.every((fire) => fire.region === "Kamloops")).toBe(true);
  });

  it("rejects when a file has the wrong schema version", async () => {
    const fetcher = fakeFetch({ "gaps.json": { body: { schema_version: 99 } } });
    await expect(loadData(fetcher)).rejects.toThrow("gaps.json has schema_version 99, but this app needs 1");
  });

  it("rejects with the file name when a file is missing", async () => {
    await expect(loadData(fakeFetch({ "q2_coverage.json": { status: 404 } }))).rejects.toThrow(
      "Could not load q2_coverage.json (HTTP 404).",
    );
  });

  it("rejects readably when the request itself fails", async () => {
    const fetcher: Fetcher = async () => {
      throw new TypeError("network down");
    };
    await expect(loadData(fetcher)).rejects.toThrow("the request failed");
  });
});

describe("curvePoint", () => {
  const q1 = readExport("q1_layouts.json") as DataFiles["q1"];

  it("finds K = 6 in the fair curve, which is its first entry", () => {
    const point = curvePoint(q1.variants.fair.curve, 6);
    expect(point?.k).toBe(6);
    expect(point).toBe(q1.variants.fair.curve[0]);
    expect(point?.site).toBe(q1.variants.fair.picks[5]);
  });

  it("returns undefined for K = 5 in the fair curve", () => {
    expect(curvePoint(q1.variants.fair.curve, 5)).toBeUndefined();
  });

  it("looks up by k, not by index", () => {
    expect(curvePoint(q1.variants.capped_pmedian.curve, 20)?.k).toBe(20);
    expect(curvePoint(q1.variants.fair.curve, 20)?.k).toBe(20);
    expect(curvePoint(q1.variants.capped_pmedian.curve, 61)).toBeUndefined();
    expect(curvePoint([], 1)).toBeUndefined();
  });
});

describe("conformance with the notebook (contract section 2)", () => {
  it("scoreLayout reproduces the stored K = 20 metrics of the capped p-median layout", () => {
    const meta = readExport("meta.json") as DataFiles["meta"];
    const candidates = (readExport("candidates.json") as DataFiles["candidates"]).candidates;
    const fires = (readExport("fires.json") as DataFiles["fires"]).fires;
    const variant = (readExport("q1_layouts.json") as DataFiles["q1"]).variants.capped_pmedian;

    const open = variant.picks.slice(0, 20).map((candId) => candidates[candId]);
    expect(open.map((candidate) => candidate.cand_id)).toEqual(variant.picks.slice(0, 20));
    const stored = curvePoint(variant.curve, 20);
    expect(stored).toBeDefined();

    const live = scoreLayout(fires, open, meta.settings, meta.ceiling.all_years);
    expect(Math.abs(live.coverage - stored!.coverage)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(live.relative - stored!.relative)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(live.mean_min - stored!.mean_min)).toBeLessThanOrEqual(0.1);
  });

  it("scoreLayout refuses an empty layout", () => {
    const meta = readExport("meta.json") as DataFiles["meta"];
    expect(() => scoreLayout([], [], meta.settings, meta.ceiling.all_years)).toThrow("empty");
  });
});
