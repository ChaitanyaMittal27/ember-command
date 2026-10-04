-- Queries used by the website's API routes. Written by notebooks/06b_export_tiger.ipynb; do not edit by hand.
-- Parameters: %(start)s and %(end)s are inclusive UTC dates, 'YYYY-MM-DD' (psycopg named-parameter style).
-- Map cells are 0.1 degrees; cell_id is the south-west corner, for example '49.2_-123.1'.

-- name: daily_detections_by_region
-- Daily detections per fire centre between two dates.
SELECT day, region, detections, frp_sum
FROM detections_daily_region
WHERE day >= (%(start)s::date)::timestamp AT TIME ZONE 'UTC'
  AND day < (%(end)s::date + 1)::timestamp AT TIME ZONE 'UTC'
ORDER BY day, region;

-- name: cell_totals
-- Totals per map cell for a date range (map heat layer). lat/lon are the detection-weighted centre.
SELECT cell_id,
       sum(detections) AS detections,
       sum(frp_sum) AS frp_sum,
       sum(lat_avg * detections) / sum(detections) AS lat,
       sum(lon_avg * detections) / sum(detections) AS lon
FROM detections_daily_cell
WHERE day >= (%(start)s::date)::timestamp AT TIME ZONE 'UTC'
  AND day < (%(end)s::date + 1)::timestamp AT TIME ZONE 'UTC'
GROUP BY cell_id
ORDER BY detections DESC;

-- name: ignitions_between
-- Ignitions between two dates, excluding static heat-source suspects.
SELECT fire_id, year, ignition_time_utc, lat, lon, weight, active_days_capped, region
FROM ignitions
WHERE NOT static_suspect
  AND ignition_time_utc >= (%(start)s::date)::timestamp AT TIME ZONE 'UTC'
  AND ignition_time_utc < (%(end)s::date + 1)::timestamp AT TIME ZONE 'UTC'
ORDER BY ignition_time_utc, fire_id;
