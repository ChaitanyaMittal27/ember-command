import { describe, expect, it } from "vitest";
import { REGION_OPTIONS, YEAR_OPTIONS } from "@/lib/filters";
import { DEFAULT_TAB, TABS } from "@/lib/tabs";

describe("tabs", () => {
  it("lists the seven sections in the spec's order", () => {
    expect(TABS.map((tab) => tab.label)).toEqual([
      "Overview",
      "Place stations",
      "How many",
      "Existing halls",
      "Gaps",
      "Evidence",
      "About",
    ]);
  });

  it("has unique ids and opens on Place stations", () => {
    expect(new Set(TABS.map((tab) => tab.id)).size).toBe(TABS.length);
    expect(TABS.find((tab) => tab.id === DEFAULT_TAB)?.label).toBe("Place stations");
  });
});

describe("header filters", () => {
  it("offers all years plus 2019 to 2023", () => {
    expect(YEAR_OPTIONS.map((option) => option.label)).toEqual([
      "All years",
      "2019",
      "2020",
      "2021",
      "2022",
      "2023",
    ]);
  });

  it("offers all of BC plus the six fire centres", () => {
    expect(REGION_OPTIONS.map((option) => option.label)).toEqual([
      "All of BC",
      "Cariboo",
      "Coastal",
      "Kamloops",
      "Northwest",
      "Prince George",
      "Southeast",
    ]);
  });
});
