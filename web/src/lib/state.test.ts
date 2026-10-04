import { describe, expect, it } from "vitest";
import { appReducer, initialState, type AppState } from "@/lib/state";

describe("app state", () => {
  it("starts on Place stations with no filters and no edits", () => {
    expect(initialState).toMatchObject({
      tab: "place",
      yearFilter: "all",
      regionFilter: "all",
      q1Variant: "capped_pmedian",
      trucksPerStation: 2,
      editedLayout: null,
      selectedStation: null,
      hallTruckMode: "need",
      gapThreshold: 60,
      evidenceK: 20,
    });
  });

  it("switching to fair with K below 6 sets K to 6", () => {
    const low: AppState = { ...initialState, k: 3 };
    expect(appReducer(low, { type: "setVariant", variant: "fair" })).toMatchObject({ q1Variant: "fair", k: 6 });
    const high: AppState = { ...initialState, k: 25 };
    expect(appReducer(high, { type: "setVariant", variant: "fair" }).k).toBe(25);
  });

  it("keeps K between 1 (fair: 6) and the curve's k_max", () => {
    expect(appReducer(initialState, { type: "setK", k: 0, kMax: 60 }).k).toBe(1);
    expect(appReducer(initialState, { type: "setK", k: 99, kMax: 60 }).k).toBe(60);
    const fair: AppState = { ...initialState, q1Variant: "fair" };
    expect(appReducer(fair, { type: "setK", k: 2, kMax: 60 }).k).toBe(6);
  });

  it("changing K or the variant resets edits", () => {
    const edited: AppState = { ...initialState, editedLayout: [1, 2, 3], selectedStation: 2 };
    expect(appReducer(edited, { type: "setK", k: 10, kMax: 60 })).toMatchObject({
      editedLayout: null,
      selectedStation: null,
    });
    expect(appReducer(edited, { type: "setVariant", variant: "fair" })).toMatchObject({
      editedLayout: null,
      selectedStation: null,
    });
    expect(appReducer(edited, { type: "resetEdits" })).toMatchObject({ editedLayout: null, selectedStation: null });
  });

  it("keeps trucks per station between 1 and 10", () => {
    expect(appReducer(initialState, { type: "setTrucksPerStation", trucks: 0 }).trucksPerStation).toBe(1);
    expect(appReducer(initialState, { type: "setTrucksPerStation", trucks: 25 }).trucksPerStation).toBe(10);
    expect(appReducer(initialState, { type: "setTrucksPerStation", trucks: 4 }).trucksPerStation).toBe(4);
  });

  it("filters and tab changes leave the scores' inputs alone", () => {
    const next = appReducer(initialState, { type: "setRegionFilter", value: "Kamloops" });
    expect(next).toMatchObject({ regionFilter: "Kamloops", k: initialState.k, q1Variant: initialState.q1Variant });
    expect(appReducer(next, { type: "setYearFilter", value: 2023 }).yearFilter).toBe(2023);
    expect(appReducer(next, { type: "setTab", tab: "gaps" }).tab).toBe("gaps");
  });
});
