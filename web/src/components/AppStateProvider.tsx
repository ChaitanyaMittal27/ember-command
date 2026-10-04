"use client";

import { createContext, useContext, useReducer, type Dispatch } from "react";
import { appReducer, initialState, type AppAction, type AppState } from "@/lib/state";

const AppStateContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
