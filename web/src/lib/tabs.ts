// The side panel's sections (FRONTEND_SPEC.md section 7), in display order.

export const TABS = [
  { id: "overview", label: "Overview", heading: "What this answers", step: "F2" },
  { id: "place", label: "Place stations", heading: "Place stations", step: "F4" },
  { id: "howmany", label: "How many", heading: "How many stations, and how many trucks?", step: "F6" },
  { id: "halls", label: "Existing halls", heading: "Today's fire halls", step: "F7" },
  { id: "gaps", label: "Gaps", heading: "Where trucks can't reach", step: "F8" },
  { id: "evidence", label: "Evidence", heading: "Does it work on fires it never saw?", step: "F9" },
  { id: "about", label: "About", heading: "Data and limits", step: "F9" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const DEFAULT_TAB: TabId = "place";
