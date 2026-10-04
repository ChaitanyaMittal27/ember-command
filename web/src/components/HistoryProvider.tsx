"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HISTORY_DEFAULT_END, HISTORY_DEFAULT_START, validateRange } from "@/lib/historyParams";
import type { CellRow, DailyRow, HistoryResponse, IgnitionRow } from "@/lib/historyTypes";

export interface HistoryData {
  start: string;
  end: string;
  daily: DailyRow[];
  cells: CellRow[];
  ignitions: number;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading"; start: string; end: string }
  | { status: "ready"; data: HistoryData }
  | { status: "error"; message: string };

interface HistoryContextValue {
  /** True once the server reports a history database; the History tab only shows then. */
  configured: boolean;
  state: LoadState;
  /** The dates in the form. Shared by the tab and the larger view, so edits carry over both ways. */
  range: { start: string; end: string };
  setRange: (range: { start: string; end: string }) => void;
  /** Fetches the three history queries for a date range. */
  load: (start: string, end: string) => void;
  /** Loads the default range the first time the tab is opened. */
  ensureLoaded: () => void;
}

const HistoryContext = createContext<HistoryContextValue>({
  configured: false,
  state: { status: "idle" },
  range: { start: HISTORY_DEFAULT_START, end: HISTORY_DEFAULT_END },
  setRange: () => {},
  load: () => {},
  ensureLoaded: () => {},
});

async function fetchRows<Row>(name: string, start: string, end: string): Promise<Row[]> {
  let response: Response;
  try {
    response = await fetch(`/api/history/${name}?start=${start}&end=${end}`);
  } catch {
    throw new Error("The history request could not be sent. Check your connection.");
  }
  const body = (await response.json().catch(() => null)) as (HistoryResponse<Row> & { error?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.error ?? `The history request failed (HTTP ${response.status}).`);
  return body.rows;
}

/** Asks the server whether history is available, and holds the loaded range for the tab and the map. */
export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [range, setRange] = useState({ start: HISTORY_DEFAULT_START, end: HISTORY_DEFAULT_END });
  const latest = useRef(0);

  useEffect(() => {
    let active = true;
    fetch("/api/history/status")
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((body: { configured?: unknown }) => {
        if (active) setConfigured(body.configured === true);
      })
      .catch(() => {
        // No status means no History tab; the rest of the app works without it.
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback((start: string, end: string) => {
    const range = validateRange(start, end);
    if (!range.ok) {
      setState({ status: "error", message: range.message });
      return;
    }
    const request = ++latest.current;
    setState({ status: "loading", start, end });
    Promise.all([
      fetchRows<DailyRow>("daily", start, end),
      fetchRows<CellRow>("cells", start, end),
      fetchRows<IgnitionRow>("ignitions", start, end),
    ]).then(
      ([daily, cells, ignitions]) => {
        // Ignore a reply that a newer request has overtaken.
        if (request === latest.current) {
          setState({ status: "ready", data: { start, end, daily, cells, ignitions: ignitions.length } });
        }
      },
      (error: unknown) => {
        if (request === latest.current) {
          setState({ status: "error", message: error instanceof Error ? error.message : "The history request failed." });
        }
      },
    );
  }, []);

  const ensureLoaded = useCallback(() => {
    if (latest.current === 0) load(HISTORY_DEFAULT_START, HISTORY_DEFAULT_END);
  }, [load]);

  const value = useMemo(
    () => ({ configured, state, range, setRange, load, ensureLoaded }),
    [configured, state, range, load, ensureLoaded],
  );
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  return useContext(HistoryContext);
}
