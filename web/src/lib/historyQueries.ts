// The three history queries, copied from notebooks/tiger_queries.sql with the psycopg parameters
// %(start)s and %(end)s written as $1 and $2 for node-postgres. A test checks they still match
// that file. $1 and $2 are inclusive UTC dates, 'YYYY-MM-DD'.

export const HISTORY_QUERIES = {
  /** Daily detections per fire centre between two dates. */
  daily: `SELECT day, region, detections, frp_sum
FROM detections_daily_region
WHERE day >= ($1::date)::timestamp AT TIME ZONE 'UTC'
  AND day < ($2::date + 1)::timestamp AT TIME ZONE 'UTC'
ORDER BY day, region;`,

  /** Totals per map cell for a date range (map heat layer). lat/lon are the detection-weighted centre. */
  cells: `SELECT cell_id,
       sum(detections) AS detections,
       sum(frp_sum) AS frp_sum,
       sum(lat_avg * detections) / sum(detections) AS lat,
       sum(lon_avg * detections) / sum(detections) AS lon
FROM detections_daily_cell
WHERE day >= ($1::date)::timestamp AT TIME ZONE 'UTC'
  AND day < ($2::date + 1)::timestamp AT TIME ZONE 'UTC'
GROUP BY cell_id
ORDER BY detections DESC;`,

  /** Ignitions between two dates, excluding static heat-source suspects. */
  ignitions: `SELECT fire_id, year, ignition_time_utc, lat, lon, weight, active_days_capped, region
FROM ignitions
WHERE NOT static_suspect
  AND ignition_time_utc >= ($1::date)::timestamp AT TIME ZONE 'UTC'
  AND ignition_time_utc < ($2::date + 1)::timestamp AT TIME ZONE 'UTC'
ORDER BY ignition_time_utc, fire_id;`,
} as const;

export type HistoryQueryName = keyof typeof HISTORY_QUERIES;

/** The statement names in notebooks/tiger_queries.sql that each query was copied from. */
export const SQL_FILE_NAMES: Record<HistoryQueryName, string> = {
  daily: "daily_detections_by_region",
  cells: "cell_totals",
  ignitions: "ignitions_between",
};
