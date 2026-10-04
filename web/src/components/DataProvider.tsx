"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { loadDataOnce, type AppData } from "@/lib/data";

export type DataState =
  | { status: "loading" }
  | { status: "ready"; data: AppData }
  | { status: "error"; message: string };

const DataContext = createContext<DataState>({ status: "loading" });

/** Fetches the exported files once and shares them with the whole app. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadDataOnce().then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

/** Loading, error or ready state of the data. */
export function useDataState(): DataState {
  return useContext(DataContext);
}

/** The loaded data, or null while loading or after an error. */
export function useData(): AppData | null {
  const state = useContext(DataContext);
  return state.status === "ready" ? state.data : null;
}
