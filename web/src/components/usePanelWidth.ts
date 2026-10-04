"use client";

import { useCallback, useSyncExternalStore } from "react";
import { clampPanelWidth, PANEL_DEFAULT_WIDTH, PANEL_STORAGE_KEY, parseStoredWidth, WIDE_BREAKPOINT } from "@/lib/panel";

// A tiny store outside React, so the saved width can be read after hydration without a mismatch:
// the server and the first client render both use the default, then the stored value takes over.
let width: number | null = null;
const listeners = new Set<() => void>();

function readStored(): number {
  try {
    return parseStoredWidth(window.localStorage.getItem(PANEL_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode, strict settings); the default still works.
    return PANEL_DEFAULT_WIDTH;
  }
}

function getWidth(): number {
  width ??= readStored();
  return width;
}

function subscribeWidth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeWindow(listener: () => void): () => void {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

/**
 * The side panel's width in pixels, remembered in localStorage.
 * `setWidth(value, false)` updates the layout without saving, for use while dragging.
 */
export function usePanelWidth() {
  const stored = useSyncExternalStore(subscribeWidth, getWidth, () => PANEL_DEFAULT_WIDTH);
  const windowWidth = useSyncExternalStore(
    subscribeWindow,
    () => window.innerWidth,
    () => 1440,
  );

  const setWidth = useCallback((value: number, save = true) => {
    width = clampPanelWidth(value, window.innerWidth);
    for (const listener of listeners) listener();
    if (!save) return;
    try {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(width));
    } catch {
      // Not being able to save only means the width is not remembered.
    }
  }, []);

  return {
    /** The width in use: the stored one, kept within the limits for this window. */
    width: clampPanelWidth(stored, windowWidth),
    windowWidth,
    /** True when the window is wide enough for the side-by-side layout. */
    wide: windowWidth >= WIDE_BREAKPOINT,
    setWidth,
  };
}
