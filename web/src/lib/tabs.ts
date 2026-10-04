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
  // Shown only when NEXT_PUBLIC_ASK_ENABLED=true (off by default).
  { id: "ask", label: "Ask about the results", short: "Ask" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "place";

/** The Ask tab is behind a flag, read when the app is built. */
export const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === "true";

/** The tabs to show: History only when it is available, Ask only when it is switched on. */
export function visibleTabs(historyAvailable: boolean, askEnabled: boolean = ASK_ENABLED) {
  return TABS.filter((tab) => (tab.id !== "history" || historyAvailable) && (tab.id !== "ask" || askEnabled));
}
