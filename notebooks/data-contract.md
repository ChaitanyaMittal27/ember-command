# Ember Command data contract (v1)

This file defines every file that `notebooks/06a_export_core.ipynb` writes and the Next.js app reads.
Both sides follow it exactly. If a field must change, change this file first, bump `schema_version`,
then update the notebook and `web/src/types/data.ts` together.

Location: `web/public/data/` (served by Next.js at `/data/<file>`). The exported JSON is committed to
the repo (Vercel deploys from it); do not gitignore this folder.

---

## 1. Global rules

| Rule | Value |
|---|---|
| Format | JSON, UTF-8, one top-level object per file. |
| Writing | Compact: `json.dumps(obj, separators=(",", ":"), allow_nan=False)`. No indentation. |
| Missing values | `null`. Never `NaN`, `Infinity`, or empty string. |
| Coordinates | `lat`, `lon` in WGS84 decimal degrees, rounded to 5 decimals. |
| Shares | Fractions 0–1 (0.623, not 62.3). Rounded to 4 decimals. Field names end in `coverage`, `relative`, or `share`. |
| Minutes | Rounded to 1 decimal. Field names end in `_min`. |
| Dates | `"YYYY-MM-DD"` (UTC date). |
| Timestamps | `"YYYY-MM-DDTHH:MM:SSZ"` (UTC). |
| `cand_id` | Integer, 0…850. Equals the candidate's index in `candidates.json` and the cost-matrix column. Halls are 0–520, towns 521–850. |
| `fire_id` | String `"YYYY-NNNNN"`, from `ignitions.parquet`. |
| `region` | One of exactly: `"Cariboo"`, `"Coastal"`, `"Kamloops"`, `"Northwest"`, `"Prince George"`, `"Southeast"`. |
| Pick lists | Ordered: element `i` is the site added at K = `i + 1`. Layout at K = first K elements. |
| Curves | Every curve entry carries its own `k`. Consumers look entries up by `k`, never by array index (the fair curve starts at K = 6). |
| Every file | Has `schema_version: 1` and `generated_at` (timestamp). |

**Which fires are scored.** Final files score on **all five years** (2019–2023) of non-static fires:
7,032 fires (4,671 + 2,361). Static suspects (195) are excluded everywhere except `static_fires.json`.
Train/test results (2019–2022 → 2023) appear **only** in `evidence.json`.

**Re-fitting.** `06a` does not reuse notebook 05's layouts for Q1, Q2 and Q3 (those were fitted on
2019–2022 only). It re-fits them on all five years with the functions in `stations.py`, by stacking
`cost_train` on top of `cost_test` (same candidate columns) and concatenating `demand_train` and
`demand_test` in the same order. Only `evidence.json` is copied from notebook 05's saved results.

**Regions.** Regions appear only as the `region` field on candidates and fires. The fire centre
polygons (BC Data Catalogue, "BC Wildfire Fire Centres") are licensed **Access Only**: they are used
privately to label points, and are never republished. No polygon file is exported.

---

## 2. Scoring formula (Python and TypeScript must match)

The browser re-scores layouts live (drag-a-station). It must reproduce the notebook's numbers.

```
haversine_km(a, b) = 2 * R * asin( sqrt( sin²(Δlat/2) + cos(lat_a)·cos(lat_b)·sin²(Δlon/2) ) )
    R = earth_radius_km from meta.json (6371.0088), angles in radians

minutes(fire, site) = haversine_km(fire, site) * detour / speed_kmh * 60 + dispatch_min

For an open set S:
  t_i        = min over s in S of minutes(fire_i, s)            (nearest open site; ties → lowest cand_id)
  coverage   = Σ w_i [t_i ≤ threshold_min] / Σ w_i
  ceiling    = coverage with S = all 851 candidates            (stored in meta.json; never recompute)
  relative   = coverage / ceiling
  mean_min   = Σ w_i t_i / Σ w_i
```

`w_i` is the fire's `weight`. Settings come from `meta.json → settings`. Use the **uncapped** minutes
for scoring; `cap_min` is only used when *choosing* sites in the notebook.

`S` must not be empty: with no open site every `t_i` is infinite. `scoreLayout` in `data.ts` throws
if it is called with an empty layout.

**Rounding rule.** Every stored metric (coverage, relative, mean minutes, ceilings, `nearest_min`,
and which fires count as covered for trucks) is computed in float64 from the **exported** values:
`lat`/`lon` rounded to 5 decimals and integer weights. That way the notebook and the browser agree by
construction. Site *selection* (the solvers) still uses the float32 cost matrices from notebook 04.
Values are rounded for storage only after they are computed. `evidence.json` is the exception: it is
copied from notebook 05, not recomputed.

**Conformance check:** the notebook recomputes the K = 20 metrics of `q1_layouts.json` from
`fires.json` + `candidates.json` using this formula and asserts they match the stored values
within 0.0001 (shares) and 0.1 (minutes). The web app should do the same check in a unit test.

---

## 3. Files

### 3.1 `meta.json` — settings and headline numbers

```json
{
  "schema_version": 1,
  "generated_at": "2026-10-04T18:00:00Z",
  "data": {
    "firms_product": "VIIRS_SNPP_SP (2022-07-27..2022-08-10 filled from VIIRS_NOAA20_SP)",
    "years": [2019, 2020, 2021, 2022, 2023],
    "train_years": [2019, 2020, 2021, 2022],
    "test_year": 2023,
    "osm_query_date": "2026-10-04",
    "weather_used": false
  },
  "settings": {
    "threshold_min": 60,
    "detour": 1.4,
    "speed_kmh": 70,
    "dispatch_min": 10,
    "earth_radius_km": 6371.0088,
    "reach_km": 41.67,
    "cap_min": 120,
    "truck_percentile": 90,
    "truck_busy_days_only": true,
    "weight_cap": 16,
    "link_km": 3.0,
    "link_days": 5
  },
  "regions": ["Cariboo", "Coastal", "Kamloops", "Northwest", "Prince George", "Southeast"],
  "counts": {
    "fires": 7032,
    "fires_by_year": {"2019": 0, "2020": 0, "2021": 0, "2022": 0, "2023": 0},
    "static_fires_excluded": 195,
    "candidates": 851,
    "halls": 521,
    "towns": 330
  },
  "ceiling": {
    "all_years": 0.0,
    "train": 0.778,
    "test": 0.511,
    "by_region": {"Cariboo": 0.0, "Coastal": 0.0, "Kamloops": 0.0, "Northwest": 0.0, "Prince George": 0.0, "Southeast": 0.0}
  }
}
```

`ceiling.all_years` and `ceiling.by_region` are on all five years. Zeros above are placeholders.

Sources: travel-time settings, `reach_km`, `osm_query_date` and train/test years from
`data/processed/model/config.json`; `cap_min`, `truck_percentile`, `truck_busy_days_only` and
`ceiling.train`/`ceiling.test` from `data/processed/results/summary.json`; `weight_cap`, `link_km` and
`link_days` from `data/processed/ignitions_meta.json` (written by notebook 03).

### 3.2 `candidates.json` — every possible site

```json
{
  "schema_version": 1, "generated_at": "...",
  "candidates": [
    {"cand_id": 0, "name": "Sooke Fire Rescue Station No. 1", "kind": "hall", "region": "Coastal",
     "lat": 48.37512, "lon": -123.72931, "population": null}
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `cand_id` | int | Equals array index. 851 entries, sorted by `cand_id`. |
| `name` | string \| null | OSM name. |
| `kind` | `"hall"` \| `"town"` | |
| `region` | Region | |
| `lat`, `lon` | number | |
| `population` | int \| null | Towns only, where OSM has it; always `null` for halls. |

### 3.3 `fires.json` — scored fires (map layer and live scoring)

```json
{
  "schema_version": 1, "generated_at": "...",
  "fires": [
    {"fire_id": "2021-00412", "year": 2021, "date": "2021-07-03", "lat": 50.23411, "lon": -121.58102,
     "weight": 7, "active_days": 4, "region": "Kamloops", "nearest_min": 38.6, "reachable": true}
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `fire_id` | string | |
| `year` | int | 2019–2023 |
| `date` | Date | `first_date` (ignition date) |
| `lat`, `lon` | number | Ignition position |
| `weight` | int | 1–16 (cells in first 48 h, capped) |
| `active_days` | int | `active_days_capped`, 1–14 |
| `region` | Region | |
| `nearest_min` | number | Minutes to the nearest of **all** 851 candidates |
| `reachable` | bool | Inside the ceiling: `nearest_min <= threshold_min`, decided on `nearest_min` **before** it is rounded to 1 decimal |

7,032 entries, sorted by `date`, then `fire_id`.

Because `reachable` is set before rounding, a fire stored as `"nearest_min": 60.0` can have
`"reachable": false` (its true value is just above 60). Consumers use `reachable`; they do not
re-derive it from the rounded `nearest_min`.

### 3.4 `static_fires.json` — excluded industrial heat sources (map layer only)

```json
{ "schema_version": 1, "generated_at": "...",
  "fires": [{"fire_id": "2020-00087", "year": 2020, "lat": 56.14421, "lon": -120.66702}] }
```

195 entries. Never used in scoring.

### 3.5 `q1_layouts.json` — Q1: best K stations (slider)

```json
{
  "schema_version": 1, "generated_at": "...",
  "fitted_on": [2019, 2020, 2021, 2022, 2023],
  "k_max": 60,
  "default_variant": "capped_pmedian",
  "variants": {
    "capped_pmedian": {
      "label": "Fastest response (capped p-median)",
      "picks": [512, 87, 640],
      "curve": [
        {"k": 1, "site": 512, "coverage": 0.0612, "relative": 0.0801, "mean_min": 241.3,
         "by_region": {"Cariboo": {"coverage": 0.0, "relative": 0.0}, "Coastal": {"coverage": 0.0, "relative": 0.0},
                       "Kamloops": {"coverage": 0.0, "relative": 0.0}, "Northwest": {"coverage": 0.0, "relative": 0.0},
                       "Prince George": {"coverage": 0.0, "relative": 0.0}, "Southeast": {"coverage": 0.0, "relative": 0.0}}}
      ]
    },
    "fair": {
      "label": "One station per fire centre first (fair)",
      "seeds": [44, 301, 512, 610, 700, 790],
      "picks": [],
      "curve": []
    }
  }
}
```

- `picks`: length `k_max` (60), unique `cand_id`s, for both variants.
- `capped_pmedian.curve`: 60 entries, `k` = 1…60, metrics for the layout `picks[:k]`, scored on all five years.
- `fair.curve`: **55 entries**, `k` = 6…60. `fair.seeds` are the 6 region seeds, which are
  `fair.picks[0:6]`; K < 6 is not defined for this variant.
- Look curve entries up by `k`, never by array index (`curve[k - 1]` is wrong for the fair variant).
- `by_region.relative` uses that region's own ceiling (`meta.ceiling.by_region`).
- Trucks for Q1 are "equal per station": the app multiplies K by a user-chosen trucks-per-station.
  No truck data is stored here.

### 3.6 `q2_coverage.json` — Q2: how many stations, and trucks

The numbers in this example (78, 62, 204) are **illustrative**: they come from the 2019–2022 fit in
notebook 05. The all-years fit in `06a` gives different values.

```json
{
  "schema_version": 1, "generated_at": "...",
  "fitted_on": [2019, 2020, 2021, 2022, 2023],
  "method": "greedy_coverage",
  "k_max": 200,
  "target_relative": 0.95,
  "k_star": 78,
  "elbow_k": 24,
  "elbow_range": [1, 60],
  "picks": [],
  "curve": [{"k": 1, "site": 640, "coverage": 0.0, "relative": 0.0, "mean_min": 0.0}],
  "stations": [
    {"cand_id": 640, "k": 1, "trucks": 3, "fires_covered": 41, "peak_active": 6}
  ],
  "total_trucks": 204,
  "by_region_at_k_star": {"Cariboo": {"coverage": 0.0, "relative": 0.0, "stations": 0, "trucks": 0}}
}
```

- `picks`, `curve`: length `k_max`, `k` = 1…200; look entries up by `k`.
- `k_star`: first K with `relative >= target_relative`, or `null` if never reached.
- `elbow_k`: `find_elbow` on the part of the curve with K inside `elbow_range` (K = 1–60), so it does
  not depend on how far the run was extended.
- `stations`: the `k_star` layout (`picks[:k_star]`) in pick order, with trucks from
  `trucks_per_station(busy_days_only=true, percentile=90)` on the covered fires of all five years
  (stations with no covered fire get 1). `peak_active` = max simultaneous covered fires on any day
  (0 for a station with no covered fire).
- `total_trucks` = sum of `stations[].trucks`.
- `by_region_at_k_star`: all 6 regions; `stations` and `trucks` count the stations located in that region.
- If `k_star` is `null`: `stations` is `[]`, and `total_trucks` and `by_region_at_k_star` are `null`.

### 3.7 `q3_halls.json` — Q3: existing fire halls

The numbers in this example (643, 53, 0.0151) are **illustrative**, from the 2019–2022 fit.

```json
{
  "schema_version": 1, "generated_at": "...",
  "fitted_on": [2019, 2020, 2021, 2022, 2023],
  "score": {"coverage": 0.0, "relative": 0.0, "mean_min": 0.0,
            "by_region": {"Cariboo": {"coverage": 0.0, "relative": 0.0, "halls": 23}}},
  "trucks": {"need_total": 643, "budget_2x": 1042},
  "halls": [
    {"cand_id": 0, "fires_covered": 12, "trucks_need": 2, "trucks_2x": 3}
  ],
  "matching": {"k": 53, "coverage": 0.0, "relative": 0.0, "mean_min": 0.0,
               "note": "first K of q2_coverage.picks whose coverage >= halls' coverage"},
  "next_stations": [
    {"rank": 1, "cand_id": 401, "coverage_after": 0.0, "gain": 0.0151}
  ]
}
```

- `halls`: all 521 halls (`cand_id` 0–520), sorted by `cand_id`.
- `trucks_need`: busy-day 90th percentile on covered fires, minimum 1. `need_total` = sum.
- `trucks_2x`: `allocate_trucks(load, budget=2 × 521)`, where `load` is `trucks_need` for a hall with
  at least one covered fire and 0 otherwise. Sums to `budget_2x`; every hall still gets at least 1.
- `matching.k` indexes into `q2_coverage.json → picks` (all-years fit). `matching` is `null` if no K
  on that curve reaches the halls' coverage.
- `next_stations`: 20 entries, `greedy_coverage(fixed=halls)`; `gain` = coverage added by that
  station, as a fraction (0.0151 = 1.51 percentage points).

### 3.8 `gaps.json` — unreachable fires and threshold sensitivity

```json
{
  "schema_version": 1, "generated_at": "...",
  "threshold_min": 60,
  "overall": {"fires": 7032, "unreachable_fires": 0, "unreachable_weight_share": 0.0},
  "by_region": [
    {"region": "Prince George", "fires": 0, "unreachable_fires": 0, "unreachable_weight_share": 0.0}
  ],
  "thresholds": [
    {"threshold_min": 30, "reach_km": 16.67, "ceiling": 0.0},
    {"threshold_min": 60, "reach_km": 41.67, "ceiling": 0.0},
    {"threshold_min": 90, "reach_km": 66.67, "ceiling": 0.0}
  ]
}
```

All five years. Unreachable = `reachable == false` in `fires.json` (the map can draw them from there).
`by_region` has all 6 regions, sorted by name. `unreachable_weight_share` = 1 − ceiling.

### 3.9 `evidence.json` — validation (train 2019–2022, test 2023)

Copied from `data/processed/results/` (notebook 05). Not recomputed.

```json
{
  "schema_version": 1, "generated_at": "...",
  "split": {"train": [2019, 2020, 2021, 2022], "test": 2023},
  "q1_variants": [
    {"variant": "capped_pmedian", "k": 20, "train_coverage": 0.377, "train_relative": 0.484,
     "test_coverage": 0.193, "test_relative": 0.378}
  ],
  "baselines": [
    {"k": 20, "layout": "capped_pmedian", "test_relative": 0.378, "test_mean_min": 153.0,
     "beats_random_coverage_share": 1.0, "beats_random_minutes_share": 1.0}
  ],
  "loyo": {
    "k": 20,
    "folds": [{"held_out_year": 2019, "coverage": 0.303, "ceiling": 0.81, "relative": 0.374}],
    "mean_jaccard": 0.30,
    "region_stability": [{"region": "Cariboo", "per_fold": [2, 3, 2, 3, 2], "mean": 2.4, "std": 0.49}]
  },
  "exact_check": {
    "coverage": [{"k": 5, "greedy": 0.1467, "exact": 0.1475, "gap_points": 0.08}],
    "pmedian": {"status": "timed_out", "variables": 956524, "note": "too large to solve exactly in 120 s"}
  },
  "fairness": [{"k": 10, "method": "capped_pmedian", "coverage": 0.230, "lowest_region": "Cariboo", "lowest_relative": 0.0}],
  "weight_sensitivity": {"k": 20, "jaccard": 0.33, "coverage_weighted": 0.377, "coverage_unweighted": 0.367},
  "overload_2023": {"k_star_train": 78, "total_trucks_train": 204, "overloaded_share": 0.012,
                    "stations_ever_overloaded": 31, "worst_day_overloaded": 6,
                    "worst_station": {"cand_id": 0, "trucks": 2, "peak_active": 11, "overloaded_days": 29}},
  "q3_split": {"halls_train": 0.653, "halls_test": 0.424, "k_match_train": 53,
               "optimized_train": 0.655, "optimized_test": 0.363}
}
```

Values above are illustrative, except `variables`; the notebook copies the real ones.

**Enums.**

- `q1_variants.variant` ∈ {`"capped_pmedian"`, `"uncapped_pmedian"`}; K = 10, 20, 40, 60 for each.
- `baselines.layout` ∈ {`"capped_pmedian"`, `"greedy_coverage"`, `"most_populous_towns"`,
  `"random_median"`, `"random_best"`}; K = 10, 20, 40.
- `fairness.method` ∈ {`"capped_pmedian"`, `"fair"`}; K = 10, 20, 40. Scored on train.
- `exact_check.pmedian.status` ∈ {`"timed_out"`, `"solved"`}.

**Units.**

- `beats_random_*_share` are fractions (1.0 = 100%); they are `null` for the two random rows.
- `exact_check.coverage[].gap_points` is in **percentage points**, not a fraction: 0.08 means the
  exact solution covers 0.08 points more than greedy (14.75% versus 14.67%).

**Where each value comes from** (files in `data/processed/results/`), and what is renamed or converted:

| Evidence field | Source | Rename or conversion |
|---|---|---|
| `q1_variants` | `summary.json → q1` | `capped` → `capped_pmedian`, `uncapped` → `uncapped_pmedian`; mean-minute columns dropped |
| `baselines` | `baselines.csv` | `capped p-median` → `capped_pmedian`, `greedy coverage` → `greedy_coverage`, `most populous towns` → `most_populous_towns`, `random (median of 1000)` → `random_median`, `random (best of 1000)` → `random_best` |
| `baselines.test_relative`, `test_mean_min` | `baselines.csv` | from `test_coverage_relative`, `test_mean_minutes` |
| `baselines.beats_random_coverage_share`, `beats_random_minutes_share` | `baselines.csv` | `beats_random_pct_coverage` ÷ 100, `beats_random_pct_minutes` ÷ 100; missing → `null` |
| `loyo.folds` | `loyo_results.csv` | `held_out_coverage` → `coverage`, `held_out_ceiling` → `ceiling`, `held_out_relative` → `relative` |
| `loyo.mean_jaccard` | `summary.json → loyo.mean_pairwise_jaccard` | |
| `loyo.region_stability` | `loyo_region_stability.csv` | columns `without_2019` … `without_2023` → `per_fold` array, in year order |
| `exact_check.coverage` | `exact_coverage_check.csv` | `greedy_coverage` → `greedy`, `exact_coverage` → `exact`; `gap_points` unchanged |
| `exact_check.pmedian.status` | `summary.json → exact_pmedian.saved_results` | every row `timed out` → `timed_out`; every row `optimal` → `solved` |
| `exact_check.pmedian.variables` | `summary.json → exact_pmedian.variables` | 956,524 (1,124 cells × 851 candidates) |
| `fairness` | `fairness.csv` | `capped p-median` → `capped_pmedian`; `lowest_region_relative` → `lowest_relative` |
| `weight_sensitivity` | `summary.json → weight_sensitivity` | `coverage_weighted_picks` → `coverage_weighted`, `coverage_unweighted_picks` → `coverage_unweighted` |
| `overload_2023` (all but `worst_station`) | `summary.json → q2` | `k_star` → `k_star_train`, `total_trucks` → `total_trucks_train`, `overload_share_2023` → `overloaded_share`, `stations_ever_overloaded_2023` → `stations_ever_overloaded`, `worst_day_overloaded_2023` → `worst_day_overloaded` |
| `overload_2023.worst_station` | `q2_stations_trucks.csv` | the row with the most `overloaded_days_2023` (ties → lowest `cand_id`); `peak_active_2023` → `peak_active`, `overloaded_days_2023` → `overloaded_days` |
| `q3_split.halls_train`, `halls_test`, `k_match_train`, `optimized_test` | `summary.json → q3` | from `halls_train_coverage`, `halls_test_coverage`, `k_matching_halls`, `matching_test_coverage` |
| `q3_split.optimized_train` | `q3_comparison.csv` | `train_coverage` of the `optimized (K)` row |

---

## 4. Checks the notebook runs before writing

1. Every `cand_id` referenced anywhere exists in `candidates.json`; every pick list is unique.
2. `candidates` sorted with `cand_id == index`; 851 entries; halls 0–520.
3. `fires.json` has 7,032 entries; no static suspects; `reachable == (nearest_min <= threshold_min)`,
   checked **before** `nearest_min` is rounded to 1 decimal.
4. Curves: `k` runs 1…`k_max` (fair: 6…60, 55 entries); `q2` coverage is non-decreasing.
5. `q2.total_trucks == sum(stations.trucks)`; `q3.trucks_2x` sums to `budget_2x`.
6. Conformance check from section 2 passes.
7. No `NaN`/`Infinity` in any file (`json.dumps(..., allow_nan=False)`).
8. Prints file sizes; total for all files except `fires.json` under 1 MB, `fires.json` under 1.5 MB.
