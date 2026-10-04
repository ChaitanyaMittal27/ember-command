// The side panel's sections (FRONTEND_SPEC.md section 7), in display order.
// `label` is the full name (the tab's accessible name and tooltip); `short` is the text on the tab.

export const TABS = [
  { id: "overview", label: "Overview", short: "Overview" },
  { id: "place", label: "Place stations", short: "Place" },
  { id: "howmany", label: "How many", short: "How many" },
  { id: "halls", label: "Existing halls", short: "Halls" },
  { id: "gaps", label: "Gaps", short: "Gaps" },
  { id: "about", label: "About", short: "About" },
  // Shown only when the server has a history database (see HistoryProvider).
  { id: "history", label: "History", short: "History" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "place";

/** The tabs to show: History only when it is available. */
export function visibleTabs(historyAvailable: boolean) {
  return TABS.filter((tab) => tab.id !== "history" || historyAvailable);
}
