"use client";

import { useMemo } from "react";
import { useAppState } from "@/components/AppStateProvider";
import type { AppData } from "@/lib/data";
import { scoreLive, type LiveScore } from "@/lib/edit";
import { q1Layout } from "@/lib/place";

// The map chip and the panel both need the live score; score each edited layout only once.
const scores = new WeakMap<number[], LiveScore | null>();

function scoreOnce(data: AppData, layout: number[]): LiveScore | null {
  let score = scores.get(layout);
  if (score === undefined) {
    score = scoreLive(data, layout);
    scores.set(layout, score);
  }
  return score;
}

/** The layout on the Place stations tab: the optimized one, or the user's edited one with its live score. */
export function usePlaceLayout(data: AppData | null) {
  const { state } = useAppState();
  const optimized = useMemo(
    () => (data ? q1Layout(data.q1, state.q1Variant, state.k) : []),
    [data, state.q1Variant, state.k],
  );
  const live = useMemo(
    () => (data && state.editedLayout ? scoreOnce(data, state.editedLayout) : null),
    [data, state.editedLayout],
  );
  return {
    /** cand_ids of the stations shown, in pick order. */
    layout: state.editedLayout ?? optimized,
    /** True while the user has moved at least one station. */
    edited: state.editedLayout !== null,
    /** Live score of the edited layout; null while showing the optimized one. */
    live,
  };
}
