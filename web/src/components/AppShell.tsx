"use client";

import { AppStateProvider } from "@/components/AppStateProvider";
import { DataProvider } from "@/components/DataProvider";
import { Header } from "@/components/Header";
import { MapArea } from "@/components/MapArea";
import { SidePanel } from "@/components/SidePanel";

/** Page layout: header, then the map and the side panel side by side (stacked on narrow screens). */
export function AppShell() {
  return (
    <DataProvider>
      <AppStateProvider>
        <div className="flex min-h-dvh flex-col bg-ground text-ink wide:h-dvh">
          <Header />
          <div className="flex flex-1 flex-wrap content-start wide:min-h-0 wide:content-stretch">
            <MapArea />
            <SidePanel />
          </div>
        </div>
      </AppStateProvider>
    </DataProvider>
  );
}
