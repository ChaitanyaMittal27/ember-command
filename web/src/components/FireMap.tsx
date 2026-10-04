"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DeckGL } from "@deck.gl/react";
import { IconLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import { setWorkerUrl } from "maplibre-gl";
import { Map as BaseMap, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AppData } from "@/lib/data";
import type { RegionFilter, YearFilter } from "@/lib/filters";
import type { HallMarker, NextMarker } from "@/lib/halls";
import { busiestCell, cellRadius, cellTooltip } from "@/lib/history";
import type { CellRow } from "@/lib/historyTypes";
import {
  BASEMAP_STYLE,
  CANDIDATE_RADIUS_PX,
  candidateTooltip,
  clampView,
  filterFires,
  fireOpacity,
  fireRadius,
  fireTooltip,
  INITIAL_VIEW,
  PICKING_RADIUS_PX,
  SELECTED_STATION_RADIUS_PX,
  showsFires,
  showsIndustrialSources,
  staticFireTooltip,
  STATION_RADIUS_PX,
  stationTooltip,
  type ViewState,
} from "@/lib/mapView";
import type { TabId } from "@/lib/tabs";
import { themeRgba } from "@/lib/theme";
import type { Candidate, Fire, StaticFire } from "@/types/data";

// The bundler does not emit MapLibre's worker file, so it is served from public/maplibre/
// (copied there by scripts/copy-maplibre-worker.mjs before dev and build).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** A white square used as a tintable icon, so halls can be drawn as squares. */
let squareIcon: string | null = null;
function squareIconUrl(): string {
  if (!squareIcon) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, 32, 32);
    }
    squareIcon = canvas.toDataURL();
  }
  return squareIcon;
}
const SQUARE_ICON = { x: 0, y: 0, width: 32, height: 32, mask: true };
const NEXT_STATION_RADIUS_PX = 6;

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
  /** The stations of the layout being shown, if the tab shows one. */
  stations: Candidate[];
  /** Straight-line reach of a station in km, drawn as a ring around each one. */
  reachKm: number;
  /** Sites to draw reach rings around, if not the stations (the Gaps tab rings every site). */
  ringSites?: Candidate[];
  /** Draw the rings under the fires instead of over them. */
  ringsBelowFires?: boolean;
  /** Dot radius in pixels per cand_id, where stations are sized by trucks; others use the default. */
  stationRadii?: Map<number, number>;
  /** An extra tooltip line per cand_id, such as the station's trucks. */
  stationNotes?: Map<number, string>;
  /** The station picked up for moving or highlighted from a list (cand_id), or null. */
  selectedStation: number | null;
  /** Existing fire halls, drawn as squares sized by trucks. */
  halls: HallMarker[];
  /** The next stations to add to the halls, drawn as numbered hollow circles. */
  nextStations: NextMarker[];
  /** The next station highlighted from its list (cand_id), or null. */
  highlightedNext: number | null;
  /** Satellite detections per map cell, drawn as a heat layer on the History tab. */
  heatCells: CellRow[];
  /** Sites a selected station can move to; empty unless one is selected. */
  candidates: Candidate[];
  onStationClick: (candId: number) => void;
  onCandidateClick: (candId: number) => void;
  /** A click that hit neither a station nor a candidate site. */
  onBackgroundClick: () => void;
}

/** The map: CARTO dark basemap under deck.gl layers. Client only (WebGL). */
export default function FireMap({
  data,
  tab,
  yearFilter,
  regionFilter,
  stations,
  reachKm,
  ringSites,
  ringsBelowFires = false,
  stationRadii,
  stationNotes,
  selectedStation,
  halls,
  nextStations,
  highlightedNext,
  heatCells,
  candidates,
  onStationClick,
  onCandidateClick,
  onBackgroundClick,
}: FireMapProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const frame = useRef<HTMLDivElement>(null);
  const basemap = useRef<MapRef>(null);

  // When the map area changes size (the side panel is dragged, expanded, or the window resized),
  // tell MapLibre straight away; deck.gl sizes its own canvas from the same box.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => basemap.current?.getMap().resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fires = useMemo(
    () => (data ? filterFires(data.fires.fires, yearFilter, regionFilter) : []),
    [data, yearFilter, regionFilter],
  );

  const layers = useMemo(() => {
    if (!data) return [];
    const ringLayer = new ScatterplotLayer<Candidate>({
      id: "rings",
      data: ringSites ?? stations,
      getPosition: (station) => [station.lon, station.lat],
      getRadius: reachKm * 1000,
      radiusUnits: "meters",
      filled: true,
      stroked: true,
      getFillColor: themeRgba("station", 0.1),
      getLineColor: themeRgba("station", 0.55),
      getLineWidth: 1,
      lineWidthUnits: "pixels",
      updateTriggers: { getRadius: reachKm },
    });
    const stationLayer = new ScatterplotLayer<Candidate>({
      id: "stations",
      data: stations,
      getPosition: (station) => [station.lon, station.lat],
      // The selected station is bigger and outlined in the fire-text colour.
      getRadius: (station) => {
        const radius = stationRadii?.get(station.cand_id) ?? STATION_RADIUS_PX;
        return station.cand_id === selectedStation ? radius + SELECTED_STATION_RADIUS_PX - STATION_RADIUS_PX : radius;
      },
      radiusUnits: "pixels",
      filled: true,
      stroked: true,
      getFillColor: themeRgba("station"),
      getLineColor: (station) => themeRgba(station.cand_id === selectedStation ? "fire-text" : "ink"),
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      pickable: true,
      updateTriggers: { getRadius: [selectedStation, stationRadii], getLineColor: selectedStation },
    });
    const candidateLayer = new ScatterplotLayer<Candidate>({
      id: "candidates",
      data: candidates,
      getPosition: (candidate) => [candidate.lon, candidate.lat],
      getRadius: CANDIDATE_RADIUS_PX,
      radiusUnits: "pixels",
      getFillColor: themeRgba("muted", 0.5),
      pickable: true,
    });
    const fireLayer = new ScatterplotLayer<Fire>({
      id: "fires",
      data: fires,
      visible: showsFires(tab),
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
    const hallLayer = new IconLayer<HallMarker>({
      id: "halls",
      data: halls,
      iconAtlas: squareIconUrl(),
      iconMapping: { square: SQUARE_ICON },
      getIcon: () => "square",
      getPosition: (hall) => [hall.candidate.lon, hall.candidate.lat],
      getSize: (hall) => hall.size,
      sizeUnits: "pixels",
      getColor: themeRgba("station"),
      pickable: true,
      updateTriggers: { getSize: halls },
    });
    const nextLayer = new ScatterplotLayer<NextMarker>({
      id: "next-stations",
      data: nextStations,
      getPosition: (next) => [next.candidate.lon, next.candidate.lat],
      getRadius: (next) => NEXT_STATION_RADIUS_PX + (next.candidate.cand_id === highlightedNext ? 3 : 0),
      radiusUnits: "pixels",
      // Hollow, with a barely visible fill so the whole circle can be hovered.
      filled: true,
      stroked: true,
      getFillColor: themeRgba("station", 0.02),
      getLineColor: (next) => themeRgba(next.candidate.cand_id === highlightedNext ? "fire-text" : "station"),
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      pickable: true,
      updateTriggers: { getRadius: highlightedNext, getLineColor: highlightedNext },
    });
    const rankLayer = new TextLayer<NextMarker>({
      id: "next-ranks",
      data: nextStations,
      getPosition: (next) => [next.candidate.lon, next.candidate.lat],
      getText: (next) => String(next.rank),
      getSize: 11,
      sizeUnits: "pixels",
      getPixelOffset: [0, -15],
      getColor: themeRgba("ink"),
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono") || "monospace",
      fontWeight: 500,
      characterSet: "0123456789",
      fontSettings: { sdf: true },
      outlineWidth: 3,
      outlineColor: themeRgba("map"),
    });
    // Drawn bottom to top, in the order of the spec's layer table.
    const busiest = busiestCell(heatCells);
    const heatLayer = new ScatterplotLayer<CellRow>({
      id: "heat",
      data: heatCells,
      getPosition: (cell) => [cell.lon, cell.lat],
      // Area grows with the detections in the cell.
      getRadius: (cell) => cellRadius(cell.detections, busiest),
      radiusUnits: "pixels",
      getFillColor: themeRgba("fire", 0.6),
      pickable: true,
      updateTriggers: { getRadius: busiest },
    });
    const base = ringsBelowFires
      ? [ringLayer, fireLayer, industrialLayer, candidateLayer]
      : [fireLayer, industrialLayer, candidateLayer, ringLayer];
    return [heatLayer, ...base, stationLayer, hallLayer, nextLayer, rankLayer];
  }, [
    data,
    fires,
    tab,
    stations,
    reachKm,
    ringSites,
    ringsBelowFires,
    stationRadii,
    selectedStation,
    candidates,
    halls,
    nextStations,
    highlightedNext,
    heatCells,
  ]);

  function getTooltip({ object, layer }: PickingInfo) {
    if (!object || !layer || !data) return null;
    let text: string;
    if (layer.id === "heat") text = cellTooltip(object as CellRow);
    else if (layer.id === "halls" || layer.id === "next-stations") text = (object as HallMarker | NextMarker).tooltip;
    else if (layer.id === "stations") {
      const station = object as Candidate;
      text = stationTooltip(station, stationNotes?.get(station.cand_id));
    }
    else if (layer.id === "candidates") {
      const candidate = object as Candidate;
      // Sites are only clickable while a station is being moved.
      text =
        selectedStation === null
          ? stationTooltip(candidate)
          : candidateTooltip(candidate, stations.some((station) => station.cand_id === candidate.cand_id));
    }
    else if (layer.id === "industrial") text = staticFireTooltip(object as StaticFire);
    else text = fireTooltip(object as Fire, data.meta.settings.threshold_min);
    return { text, style: TOOLTIP_STYLE };
  }

  return (
    <div ref={frame} className="absolute inset-0">
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: next }) => setViewState(clampView(next as unknown as ViewState))}
      controller={{ dragRotate: false, touchRotate: false, keyboard: true }}
      layers={layers}
      getTooltip={getTooltip}
      pickingRadius={PICKING_RADIUS_PX}
      onClick={({ object, layer }) => {
        if (object && layer?.id === "stations") onStationClick((object as Candidate).cand_id);
        else if (object && layer?.id === "candidates") onCandidateClick((object as Candidate).cand_id);
        else onBackgroundClick();
      }}
      getCursor={({ isDragging, isHovering }) => (isDragging ? "grabbing" : isHovering ? "pointer" : "grab")}
    >
      <BaseMap ref={basemap} reuseMaps mapStyle={BASEMAP_STYLE} attributionControl={false} />
    </DeckGL>
    </div>
  );
}
