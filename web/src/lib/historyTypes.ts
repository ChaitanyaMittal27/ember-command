// Shapes returned by the /api/history routes. No server code here, so the browser can import it.

import type { Region } from "@/types/data";

export interface DailyRow {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  region: Region;
  detections: number;
  frp_sum: number;
}
export interface CellRow {
  cell_id: string;
  detections: number;
  frp_sum: number;
  lat: number;
  lon: number;
}
export interface IgnitionRow {
  fire_id: string;
  year: number;
  ignition_time_utc: string;
  lat: number;
  lon: number;
  weight: number;
  active_days_capped: number;
  region: Region;
}
export interface HistoryResponse<Row> {
  start: string;
  end: string;
  rows: Row[];
}
