"use client";

import { useMemo, useState } from "react";
import { DeckGL } from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import { setWorkerUrl } from "maplibre-gl";
import { Map as BaseMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AppData } from "@/lib/data";
import type { RegionFilter, YearFilter } from "@/lib/filters";
import {
  BASEMAP_STYLE,
  clampView,
  filterFires,
  fireOpacity,
  fireRadius,
  fireTooltip,
  INITIAL_VIEW,
  showsIndustrialSources,
  staticFireTooltip,
  type ViewState,
} from "@/lib/mapView";
import type { TabId } from "@/lib/tabs";
import { themeRgba } from "@/lib/theme";
import type { Fire, StaticFire } from "@/types/data";

// The bundler does not emit MapLibre's worker file, so it is served from public/maplibre/
// (copied there by scripts/copy-maplibre-worker.mjs before dev and build).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-overlay)",
  border: "1px solid var(--color-line-strong)",
  borderRadius: "8px",
  color: "var(--color-ink)",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  lineHeight: "1.5",
  padding: "8px 12px",
  whiteSpace: "pre-line",
};

interface FireMapProps {
  /** Null while the data is loading: the basemap shows with nothing on it. */
  data: AppData | null;
  tab: TabId;
  yearFilter: YearFilter;
  regionFilter: RegionFilter;
}

/** The map: CARTO dark basemap under deck.gl layers. Client only (WebGL). */
export default function FireMap({ data, tab, yearFilter, regionFilter }: FireMapProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);

  const fires = useMemo(
    () => (data ? filterFires(data.fires.fires, yearFilter, regionFilter) : []),
    [data, yearFilter, regionFilter],
  );

  const layers = useMemo(() => {
    if (!data) return [];
    const fireLayer = new ScatterplotLayer<Fire>({
      id: "fires",
      data: fires,
      getPosition: (fire) => [fire.lon, fire.lat],
      getRadius: fireRadius,
      radiusUnits: "pixels",
      // Reachable fires are filled; unreachable ones are hollow rings (never colour alone).
      filled: true,
      stroked: true,
      getFillColor: (fire) => themeRgba("fire", fire.reachable ? fireOpacity(tab, true) : 0),
      getLineColor: (fire) => themeRgba("fire", fire.reachable ? 0 : fireOpacity(tab, false)),
      getLineWidth: (fire) => (fire.reachable ? 0 : 1.5),
      lineWidthUnits: "pixels",
      pickable: true,
      updateTriggers: { getFillColor: tab, getLineColor: tab },
    });
    const industrialLayer = new ScatterplotLayer<StaticFire>({
      id: "industrial",
      data: data.staticFires.fires,
      visible: showsIndustrialSources(tab),
      getPosition: (fire) => [fire.lon, fire.lat],
      getRadius: 3,
      radiusUnits: "pixels",
      getFillColor: themeRgba("neutral"),
      pickable: true,
    });
    return [fireLayer, industrialLayer];
  }, [data, fires, tab]);

  function getTooltip({ object, layer }: PickingInfo) {
    if (!object || !layer || !data) return null;
    const text =
      layer.id === "industrial"
        ? staticFireTooltip(object as StaticFire)
        : fireTooltip(object as Fire, data.meta.settings.threshold_min);
    return { text, style: TOOLTIP_STYLE };
  }

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: next }) => setViewState(clampView(next as unknown as ViewState))}
      controller={{ dragRotate: false, touchRotate: false, keyboard: true }}
      layers={layers}
      getTooltip={getTooltip}
    >
      <BaseMap reuseMaps mapStyle={BASEMAP_STYLE} attributionControl={false} />
    </DeckGL>
  );
}
