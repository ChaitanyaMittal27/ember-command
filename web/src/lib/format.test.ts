import { describe, expect, it } from "vitest";
import { int, mins, pct, points, siteName } from "@/lib/format";

describe("pct", () => {
  it("formats a share as a percentage with one decimal", () => {
    expect(pct(0.377)).toBe("37.7%");
    expect(pct(0.6818)).toBe("68.2%");
  });

  it("handles the ends of the range", () => {
    expect(pct(0)).toBe("0.0%");
    expect(pct(1)).toBe("100.0%");
  });

  it("takes a digits argument", () => {
    expect(pct(0.37749, 0)).toBe("38%");
    expect(pct(0.37749, 2)).toBe("37.75%");
  });

  it("shows a dash for missing values", () => {
    expect(pct(null)).toBe("—");
    expect(pct(undefined)).toBe("—");
    expect(pct(Number.NaN)).toBe("—");
    expect(pct(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("mins", () => {
  it("uses no decimals by default and one when asked", () => {
    expect(mins(114.3)).toBe("114 min");
    expect(mins(114.34, 1)).toBe("114.3 min");
    expect(mins(76.2, 1)).toBe("76.2 min");
  });

  it("rounds to the nearest minute", () => {
    expect(mins(114.5)).toBe("115 min");
    expect(mins(0)).toBe("0 min");
  });

  it("shows a dash for missing values", () => {
    expect(mins(null)).toBe("—");
    expect(mins(undefined)).toBe("—");
    expect(mins(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("int, points and siteName", () => {
  it("adds thousands separators", () => {
    expect(int(7032)).toBe("7,032");
    expect(int(851)).toBe("851");
    expect(int(1225332)).toBe("1,225,332");
    expect(int(null)).toBe("—");
  });

  it("shows gap_points as points, not as a percentage", () => {
    expect(points(0.08)).toBe("0.08 pts");
    expect(points(0)).toBe("0.00 pts");
    expect(points(null)).toBe("—");
  });

  it("falls back to a generic name by kind", () => {
    expect(siteName({ name: "Lytton", kind: "town" })).toBe("Lytton");
    expect(siteName({ name: null, kind: "hall" })).toBe("Unnamed fire hall");
    expect(siteName({ name: null, kind: "town" })).toBe("Unnamed place");
  });
});
