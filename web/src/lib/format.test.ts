import { describe, expect, it } from "vitest";
import { int, mins, pct, points, signed, siteName } from "@/lib/format";

describe("pct", () => {
  it("formats a share as a percentage with one decimal", () => {
    expect(pct(0.377)).toBe("37.7%");
    expect(pct(0.6818)).toBe("68.2%");
  });

  it("rounds exact halves up, not down", () => {
    // toFixed alone gives "44.1%": 44.15 is stored as 44.1499999...
    expect(pct(0.4415)).toBe("44.2%");
    expect(pct(0.3015)).toBe("30.2%");
    expect(pct(0.1235)).toBe("12.4%");
    expect(pct(0.0005)).toBe("0.1%");
    expect(pct(0.9995)).toBe("100.0%");
    expect(pct(0.045, 0)).toBe("5%");
    expect(pct(0.44149)).toBe("44.1%");
    expect(pct(-0.4415)).toBe("-44.2%");
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

  it("signed changes carry their sign, and vanish when they round to zero", () => {
    expect(signed(1.23, "pts")).toBe("+1.2 pts");
    expect(signed(-0.84, "pts")).toBe("−0.8 pts");
    expect(signed(-3.26, "min")).toBe("−3.3 min");
    expect(signed(0.04, "pts")).toBeNull();
    expect(signed(-0.04, "pts")).toBeNull();
    expect(signed(0, "min")).toBeNull();
  });

  it("falls back to a generic name by kind", () => {
    expect(siteName({ name: "Lytton", kind: "town" })).toBe("Lytton");
    expect(siteName({ name: null, kind: "hall" })).toBe("Unnamed fire hall");
    expect(siteName({ name: null, kind: "town" })).toBe("Unnamed place");
  });
});
