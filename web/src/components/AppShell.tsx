"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { MapArea } from "@/components/MapArea";
import { SidePanel } from "@/components/SidePanel";
import type { RegionFilter, YearFilter } from "@/lib/filters";
import { DEFAULT_TAB, type TabId } from "@/lib/tabs";

/** Page layout: header, then the map and the side panel side by side (stacked on narrow screens). */
export function AppShell() {
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");

  return (
    <div className="flex min-h-dvh flex-col bg-ground text-ink wide:h-dvh">
      <Header
        yearFilter={yearFilter}
        regionFilter={regionFilter}
        onYearChange={setYearFilter}
        onRegionChange={setRegionFilter}
      />
      <div className="flex flex-1 flex-wrap content-start wide:min-h-0 wide:content-stretch">
        <MapArea />
        <SidePanel tab={tab} onTabChange={setTab} />
      </div>
    </div>
  );
}
