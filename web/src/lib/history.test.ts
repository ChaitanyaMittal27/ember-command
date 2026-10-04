import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// node-postgres is replaced by a fake pool, so no test ever opens a connection.
const pg = vi.hoisted(() => ({ query: vi.fn(), created: vi.fn() }));
vi.mock("pg", () => ({
  Pool: class {
    constructor(options: unknown) {
      pg.created(options);
    }
    query = pg.query;
  },
}));

import { GET as getCells } from "@/app/api/history/cells/route";
import { GET as getDaily } from "@/app/api/history/daily/route";
import { GET as getIgnitions } from "@/app/api/history/ignitions/route";
import { GET as getStatus } from "@/app/api/history/status/route";
import { libpqCompatible } from "@/lib/db";
import { busiestCell, cellRadius, cellTooltip, dailySeries, regionTotals, totalDetections } from "@/lib/history";
import { daysBetween, validateRange } from "@/lib/historyParams";
import { HISTORY_QUERIES, SQL_FILE_NAMES, type HistoryQueryName } from "@/lib/historyQueries";
import type { DailyRow } from "@/lib/historyTypes";

const SECRET_URL = "postgres://tsdbadmin:s3cret-pass@db.example.tsdb.cloud:5432/tsdb?sslmode=require";
const request = (path: string) => new Request(`http://localhost${path}`);

beforeEach(() => {
  pg.query.mockReset();
  pg.created.mockReset();
  delete (globalThis as { __historyPool?: unknown }).__historyPool;
  process.env.TIGER_DATABASE_URL = SECRET_URL;
});
afterEach(() => {
  delete process.env.TIGER_DATABASE_URL;
  vi.restoreAllMocks();
});

describe("validateRange", () => {
  it("accepts good ranges and counts both end dates", () => {
    expect(validateRange("2023-07-01", "2023-09-30")).toEqual({ ok: true, start: "2023-07-01", end: "2023-09-30", days: 92 });
    expect(validateRange("2021-06-28", "2021-06-28")).toMatchObject({ ok: true, days: 1 });
    expect(validateRange("2019-05-01", "2019-10-31")).toMatchObject({ ok: true, days: 184 });
    expect(validateRange("2020-02-29", "2020-02-29")).toMatchObject({ ok: true, days: 1 }); // a real leap day
    expect(validateRange("2023-10-31", "2023-10-31").ok).toBe(true);
  });

  it("rejects missing or malformed dates", () => {
    for (const [start, end] of [
      [null, "2023-09-30"],
      ["2023-07-01", undefined],
      ["", ""],
      ["2023-7-1", "2023-09-30"],
      ["07/01/2023", "2023-09-30"],
      ["2023-07-01T00:00:00Z", "2023-09-30"],
      ["2023-07-01", "2023-09-31"],
      ["2023-02-30", "2023-03-05"],
      ["2023-13-01", "2023-12-01"],
      ["2023-07-01'; DROP TABLE detections; --", "2023-09-30"],
    ] as const) {
      const result = validateRange(start, end);
      expect(result.ok, `${start} to ${end}`).toBe(false);
    }
  });

  it("rejects dates outside 2019-05-01 to 2023-10-31", () => {
    expect(validateRange("2019-04-30", "2019-05-10")).toEqual({ ok: false, message: "Dates must be between 2019-05-01 and 2023-10-31." });
    expect(validateRange("2023-10-01", "2023-11-01").ok).toBe(false);
    expect(validateRange("2018-07-01", "2018-07-31").ok).toBe(false);
    expect(validateRange("2024-07-01", "2024-07-31").ok).toBe(false);
  });

  it("rejects a reversed range", () => {
    expect(validateRange("2023-09-30", "2023-07-01")).toEqual({ ok: false, message: "The start date must not be after the end date." });
  });

  it("rejects a range longer than 184 days", () => {
    expect(validateRange("2022-05-01", "2022-10-31")).toMatchObject({ ok: true, days: 184 });
    expect(validateRange("2022-05-01", "2022-11-01")).toEqual({
      ok: false,
      message: "The range can be at most 184 days; this one is 185.",
    });
    expect(validateRange("2020-05-01", "2021-05-01")).toEqual({
      ok: false,
      message: "The range can be at most 184 days; this one is 366.",
    });
  });

  it("lists every day of a range", () => {
    expect(daysBetween("2023-06-29", "2023-07-02")).toEqual(["2023-06-29", "2023-06-30", "2023-07-01", "2023-07-02"]);
    expect(daysBetween("2023-07-01", "2023-09-30")).toHaveLength(92);
  });
});

describe("the queries", () => {
  it("match notebooks/tiger_queries.sql with the parameters converted to $1 and $2", () => {
    const file = readFileSync(fileURLToPath(new URL("../../../notebooks/tiger_queries.sql", import.meta.url)), "utf8");
    const normalise = (sql: string) => sql.replace(/\r/g, "").replace(/\s+/g, " ").trim();
    for (const name of Object.keys(HISTORY_QUERIES) as HistoryQueryName[]) {
      const block = file.replace(/\r/g, "").split(`-- name: ${SQL_FILE_NAMES[name]}\n`)[1];
      expect(block, name).toBeDefined();
      const statement = block
        .split("\n-- name:")[0]
        .split("\n")
        .filter((line) => !line.startsWith("--"))
        .join("\n");
      const converted = statement.replaceAll("%(start)s", "$1").replaceAll("%(end)s", "$2");
      expect(normalise(HISTORY_QUERIES[name])).toBe(normalise(converted));
      expect(HISTORY_QUERIES[name]).not.toContain("%(");
    }
  });
});

describe("GET /api/history/status", () => {
  it("reports not configured when the variable is unset or blank, without creating a pool", async () => {
    for (const value of [undefined, "", "   "]) {
      if (value === undefined) delete process.env.TIGER_DATABASE_URL;
      else process.env.TIGER_DATABASE_URL = value;
      const response = getStatus();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ configured: false });
    }
    expect(pg.created).not.toHaveBeenCalled();
    expect(pg.query).not.toHaveBeenCalled();
  });

  it("reports configured when it is set, still without touching the database", async () => {
    expect(await getStatus().json()).toEqual({ configured: true });
    expect(pg.created).not.toHaveBeenCalled();
    expect(pg.query).not.toHaveBeenCalled();
  });
});

describe("GET /api/history/daily, cells and ignitions", () => {
  it("runs the matching query with start then end, and shapes the rows", async () => {
    pg.query.mockResolvedValueOnce({
      rows: [{ day: new Date("2023-07-01T00:00:00Z"), region: "Kamloops", detections: "1234", frp_sum: 5678.5 }],
    });
    const daily = await getDaily(request("/api/history/daily?start=2023-07-01&end=2023-09-30"));
    expect(daily.status).toBe(200);
    expect(pg.query).toHaveBeenLastCalledWith(HISTORY_QUERIES.daily, ["2023-07-01", "2023-09-30"]);
    expect(await daily.json()).toEqual({
      start: "2023-07-01",
      end: "2023-09-30",
      rows: [{ day: "2023-07-01", region: "Kamloops", detections: 1234, frp_sum: 5678.5 }],
    });

    pg.query.mockResolvedValueOnce({ rows: [{ cell_id: "49.2_-123.1", detections: "7", frp_sum: "10.5", lat: 49.25, lon: -123.05 }] });
    const cells = await getCells(request("/api/history/cells?start=2021-06-01&end=2021-06-30"));
    expect(pg.query).toHaveBeenLastCalledWith(HISTORY_QUERIES.cells, ["2021-06-01", "2021-06-30"]);
    expect((await cells.json()).rows).toEqual([{ cell_id: "49.2_-123.1", detections: 7, frp_sum: 10.5, lat: 49.25, lon: -123.05 }]);

    pg.query.mockResolvedValueOnce({
      rows: [{ fire_id: "2023-00001", year: 2023, ignition_time_utc: new Date("2023-07-01T10:41:00Z"), lat: 50, lon: -120, weight: 3, active_days_capped: 5, region: "Kamloops" }],
    });
    const ignitions = await getIgnitions(request("/api/history/ignitions?start=2023-07-01&end=2023-07-02"));
    expect(pg.query).toHaveBeenLastCalledWith(HISTORY_QUERIES.ignitions, ["2023-07-01", "2023-07-02"]);
    expect((await ignitions.json()).rows[0]).toMatchObject({ fire_id: "2023-00001", ignition_time_utc: "2023-07-01T10:41:00.000Z" });
  });

  it("opens one pool with at most three connections", async () => {
    pg.query.mockResolvedValue({ rows: [] });
    await getDaily(request("/api/history/daily?start=2023-07-01&end=2023-07-02"));
    await getCells(request("/api/history/cells?start=2023-07-01&end=2023-07-02"));
    expect(pg.created).toHaveBeenCalledTimes(1);
    expect(pg.created).toHaveBeenCalledWith(
      expect.objectContaining({ max: 3, connectionString: `${SECRET_URL}&uselibpqcompat=true` }),
    );
  });

  it("keeps the connection string intact apart from the libpq-compatibility flag", () => {
    expect(libpqCompatible("postgres://u:p%40ss@host:5432/db?sslmode=require")).toBe(
      "postgres://u:p%40ss@host:5432/db?sslmode=require&uselibpqcompat=true",
    );
    expect(libpqCompatible("postgres://u:p@host/db")).toBe("postgres://u:p@host/db?uselibpqcompat=true");
    expect(libpqCompatible("postgres://u:p@host/db?uselibpqcompat=false")).toBe("postgres://u:p@host/db?uselibpqcompat=false");
    expect(libpqCompatible("not a url")).toBe("not a url");
  });

  it("answers 400 with a short message for a bad range, without querying", async () => {
    for (const query of ["", "?start=2023-07-01", "?start=2023-7-1&end=2023-09-30", "?start=2023-09-30&end=2023-07-01",
      "?start=2018-07-01&end=2018-07-31", "?start=2020-05-01&end=2021-05-01"]) {
      const response = await getDaily(request(`/api/history/daily${query}`));
      expect(response.status, query).toBe(400);
      const body = await response.json();
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeLessThan(120);
    }
    expect(pg.query).not.toHaveBeenCalled();
    expect(pg.created).not.toHaveBeenCalled();
  });

  it("answers 503 when no database is configured", async () => {
    delete process.env.TIGER_DATABASE_URL;
    const response = await getCells(request("/api/history/cells?start=2023-07-01&end=2023-07-02"));
    expect(response.status).toBe(503);
    expect(pg.created).not.toHaveBeenCalled();
  });

  it("answers 500 with a generic message that leaks nothing from the database error", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(
      new Error(`password authentication failed for user "tsdbadmin" at db.example.tsdb.cloud (${SECRET_URL})`),
      { code: "28P01" },
    );
    for (const get of [getDaily, getCells, getIgnitions]) {
      pg.query.mockRejectedValueOnce(failure);
      const response = await get(request("/api/history/x?start=2023-07-01&end=2023-07-02"));
      expect(response.status).toBe(500);
      const text = JSON.stringify(await response.json());
      expect(text).toBe('{"error":"The history database could not be reached. Try again later."}');
      for (const secret of ["s3cret-pass", "tsdbadmin", "tsdb.cloud", "postgres://", "password authentication", "28P01"]) {
        expect(text).not.toContain(secret);
      }
    }
    // The server log gets the error's type and code, not its message or the connection string.
    const logText = JSON.stringify(logged.mock.calls);
    expect(logText).toContain("28P01");
    expect(logText).not.toContain("s3cret-pass");
    expect(logText).not.toContain("tsdb.cloud");
  });
});

describe("chart and map helpers", () => {
  const rows: DailyRow[] = [
    { day: "2023-07-01", region: "Kamloops", detections: 10, frp_sum: 1 },
    { day: "2023-07-01", region: "Coastal", detections: 4, frp_sum: 1 },
    { day: "2023-07-03", region: "Kamloops", detections: 6, frp_sum: 1 },
  ];

  it("gives every day a row, with zero where a fire centre had no detections", () => {
    const series = dailySeries(rows, "2023-07-01", "2023-07-03");
    expect(series.map((row) => row.day)).toEqual(["2023-07-01", "2023-07-02", "2023-07-03"]);
    expect(series[0]).toMatchObject({ Kamloops: 10, Coastal: 4, Cariboo: 0 });
    expect(series[1]).toMatchObject({ Kamloops: 0, Coastal: 0, "Prince George": 0 });
    expect(series[2].Kamloops).toBe(6);
  });

  it("totals by fire centre and overall", () => {
    expect(regionTotals(rows)).toMatchObject({ Kamloops: 16, Coastal: 4, Southeast: 0 });
    expect(totalDetections(rows)).toBe(20);
    expect(totalDetections([])).toBe(0);
  });

  it("scales the heat dots by the square root of the detections", () => {
    expect(cellRadius(100, 100)).toBe(16);
    expect(cellRadius(25, 100)).toBeCloseTo(1.5 + 0.5 * 14.5, 10);
    expect(cellRadius(0, 100)).toBe(1.5);
    expect(cellRadius(5, 0)).toBe(1.5);
    expect(cellRadius(400, 100)).toBe(16);
    expect(busiestCell([{ cell_id: "a", detections: 3, frp_sum: 0, lat: 0, lon: 0 }, { cell_id: "b", detections: 9, frp_sum: 0, lat: 0, lon: 0 }])).toBe(9);
    expect(busiestCell([])).toBe(0);
  });

  it("describes a cell on hover", () => {
    expect(cellTooltip({ cell_id: "49.2_-123.1", detections: 1234, frp_sum: 0, lat: 0, lon: 0 })).toBe(
      "1,234 satellite detections\nCell 49.2_-123.1 (0.1° square)",
    );
    expect(cellTooltip({ cell_id: "x", detections: 1, frp_sum: 0, lat: 0, lon: 0 })).toContain("1 satellite detection\n");
  });
});
