"use client";

import { useRef } from "react";
import { useAppState } from "@/components/AppStateProvider";

/**
 * Links the rows of a station list to the map: hovering a row, or walking the rows with the arrow
 * keys while the list has focus, highlights that station on the map.
 * `ids` are the rows' cand_ids in display order.
 */
export function useRowHighlight(ids: number[]) {
  const { state, dispatch } = useAppState();
  const rows = useRef(new Map<number, HTMLTableRowElement>());
  const highlight = (candId: number | null) => dispatch({ type: "hoverStation", candId });

  return {
    highlighted: state.hoveredStation,
    highlight,
    /** Props for the focusable box around the list. */
    listProps: {
      tabIndex: 0,
      onMouseLeave: () => highlight(null),
      onBlur: () => highlight(null),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const current = ids.indexOf(state.hoveredStation ?? Number.NaN);
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = ids[Math.min(ids.length - 1, Math.max(0, current === -1 ? 0 : current + step))];
        highlight(next);
        rows.current.get(next)?.scrollIntoView({ block: "nearest" });
      },
    },
    /** Props for one row. */
    rowProps: (candId: number) => ({
      ref: (element: HTMLTableRowElement | null) => {
        if (element) rows.current.set(candId, element);
        else rows.current.delete(candId);
      },
      onMouseEnter: () => highlight(candId),
      "aria-current": candId === state.hoveredStation ? ("true" as const) : undefined,
    }),
  };
}
