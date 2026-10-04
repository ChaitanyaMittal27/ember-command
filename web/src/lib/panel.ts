// Width of the resizable side panel (desktop only). Pure rules here; the store adds localStorage.

export const PANEL_DEFAULT_WIDTH = 400;
export const PANEL_MIN_WIDTH = 320;
/** The panel may take up to this share of the window width. */
export const PANEL_MAX_SHARE = 0.6;
/** Arrow keys on the drag handle change the width by this much. */
export const PANEL_KEY_STEP = 40;
/** The layout is side by side from this window width up. Matches --breakpoint-wide in globals.css. */
export const WIDE_BREAKPOINT = 960;
export const PANEL_STORAGE_KEY = "firstdue.panelWidth";

/** Largest panel width for a window: 60% of it, but never less than the minimum. */
export function panelMaxWidth(windowWidth: number): number {
  return Math.max(PANEL_MIN_WIDTH, Math.round(windowWidth * PANEL_MAX_SHARE));
}

/** A width kept between 320px and 60% of the window. */
export function clampPanelWidth(width: number, windowWidth: number): number {
  return Math.min(panelMaxWidth(windowWidth), Math.max(PANEL_MIN_WIDTH, Math.round(width)));
}

/** A stored width, or the default if it is missing or not a sensible number. */
export function parseStoredWidth(stored: string | null | undefined): number {
  if (stored === null || stored === undefined || !/^\d{1,5}(\.\d+)?$/.test(stored.trim())) return PANEL_DEFAULT_WIDTH;
  const width = Number(stored);
  return Number.isFinite(width) && width >= PANEL_MIN_WIDTH ? Math.round(width) : PANEL_DEFAULT_WIDTH;
}

/** The panel is on the right, so its width is the distance from the pointer to the window's right edge. */
export function widthFromPointer(pointerX: number, windowWidth: number): number {
  return clampPanelWidth(windowWidth - pointerX, windowWidth);
}

/** Left arrow widens the panel (the handle moves left); right arrow narrows it. */
export function widthAfterKey(key: string, width: number, windowWidth: number): number | null {
  const current = clampPanelWidth(width, windowWidth);
  if (key === "ArrowLeft") return clampPanelWidth(current + PANEL_KEY_STEP, windowWidth);
  if (key === "ArrowRight") return clampPanelWidth(current - PANEL_KEY_STEP, windowWidth);
  if (key === "Home") return PANEL_MIN_WIDTH;
  if (key === "End") return panelMaxWidth(windowWidth);
  return null;
}

/** True when the panel is at (or within a pixel of) its largest width. */
export function isExpanded(width: number, windowWidth: number): boolean {
  return clampPanelWidth(width, windowWidth) >= panelMaxWidth(windowWidth) - 1;
}

/**
 * The expand button: from any other width go to the largest, remembering where it was; from the
 * largest go back to the remembered width (or the default if there is none).
 */
export function toggleExpanded(
  width: number,
  restoreTo: number | null,
  windowWidth: number,
): { width: number; restoreTo: number | null } {
  if (isExpanded(width, windowWidth)) {
    const back = restoreTo !== null && !isExpanded(restoreTo, windowWidth) ? restoreTo : PANEL_DEFAULT_WIDTH;
    return { width: clampPanelWidth(back, windowWidth), restoreTo: null };
  }
  return { width: panelMaxWidth(windowWidth), restoreTo: clampPanelWidth(width, windowWidth) };
}
