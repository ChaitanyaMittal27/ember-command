import { describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  isExpanded,
  PANEL_DEFAULT_WIDTH,
  PANEL_MIN_WIDTH,
  panelMaxWidth,
  parseStoredWidth,
  toggleExpanded,
  widthAfterKey,
  widthFromPointer,
} from "@/lib/panel";

describe("panel width limits", () => {
  it("allows up to 60% of the window", () => {
    expect(panelMaxWidth(1440)).toBe(864);
    expect(panelMaxWidth(1000)).toBe(600);
  });

  it("never lets the largest width fall below the minimum", () => {
    expect(panelMaxWidth(400)).toBe(PANEL_MIN_WIDTH);
  });

  it("keeps a width between 320px and 60% of the window", () => {
    expect(clampPanelWidth(100, 1440)).toBe(320);
    expect(clampPanelWidth(500, 1440)).toBe(500);
    expect(clampPanelWidth(2000, 1440)).toBe(864);
    expect(clampPanelWidth(500.6, 1440)).toBe(501);
  });
});

describe("parseStoredWidth", () => {
  it("reads a stored width", () => {
    expect(parseStoredWidth("520")).toBe(520);
    expect(parseStoredWidth(" 520.4 ")).toBe(520);
  });

  it("falls back to 400px when the value is missing or invalid", () => {
    for (const stored of [null, undefined, "", "wide", "NaN", "-500", "1e3", "12px", "100", "Infinity", "{}"]) {
      expect(parseStoredWidth(stored)).toBe(PANEL_DEFAULT_WIDTH);
    }
  });
});

describe("widthFromPointer", () => {
  it("measures from the pointer to the right edge of the window", () => {
    expect(widthFromPointer(940, 1440)).toBe(500);
  });

  it("stops at the limits", () => {
    expect(widthFromPointer(1400, 1440)).toBe(320);
    expect(widthFromPointer(0, 1440)).toBe(864);
  });
});

describe("widthAfterKey", () => {
  it("changes the width in 40px steps: left widens, right narrows", () => {
    expect(widthAfterKey("ArrowLeft", 400, 1440)).toBe(440);
    expect(widthAfterKey("ArrowRight", 400, 1440)).toBe(360);
  });

  it("stops at the limits", () => {
    expect(widthAfterKey("ArrowRight", 340, 1440)).toBe(320);
    expect(widthAfterKey("ArrowLeft", 850, 1440)).toBe(864);
  });

  it("jumps to the ends with Home and End, and ignores other keys", () => {
    expect(widthAfterKey("Home", 500, 1440)).toBe(320);
    expect(widthAfterKey("End", 500, 1440)).toBe(864);
    expect(widthAfterKey("Enter", 500, 1440)).toBeNull();
  });
});

describe("toggleExpanded", () => {
  it("expands to 60% of the window and remembers the width it came from", () => {
    expect(toggleExpanded(500, null, 1440)).toEqual({ width: 864, restoreTo: 500 });
  });

  it("restores the remembered width", () => {
    expect(toggleExpanded(864, 500, 1440)).toEqual({ width: 500, restoreTo: null });
  });

  it("restores to the default when there is nothing to go back to", () => {
    expect(toggleExpanded(864, null, 1440)).toEqual({ width: 400, restoreTo: null });
    expect(toggleExpanded(864, 864, 1440)).toEqual({ width: 400, restoreTo: null });
  });

  it("knows when the panel is expanded", () => {
    expect(isExpanded(864, 1440)).toBe(true);
    expect(isExpanded(863, 1440)).toBe(true);
    expect(isExpanded(500, 1440)).toBe(false);
  });
});
