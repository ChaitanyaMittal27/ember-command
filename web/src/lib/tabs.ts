// The side panel's sections (FRONTEND_SPEC.md section 7), in display order.

export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "place", label: "Place stations" },
  { id: "howmany", label: "How many" },
  { id: "halls", label: "Existing halls" },
  { id: "gaps", label: "Gaps" },
  { id: "evidence", label: "Evidence" },
  { id: "about", label: "About" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "place";
