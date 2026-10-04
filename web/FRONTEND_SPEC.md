# FirstDue: frontend spec

Build the web app in `web/` exactly to this spec. Data comes **only** from the JSON files in
`web/public/data/`, defined by `notebooks/data-contract.md` and typed in `web/src/types/data.ts`.
Read both before starting. The browser never optimizes anything; the only computation is the
live re-scoring in the drag-a-station feature, using `scoreLayout` from `data.ts`.

Work in the numbered steps of section 9, one step per session, and pass every verification gate
before reporting a step done. Ask before deviating from this spec or the contract.

The app's user-facing name is **FirstDue** (code identifiers, folders and the repo keep their names).
Sections 2, 5, 6 and 7 describe the app as built after the two UI-update passes that followed F11;
section 9 is the original build history.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable), App Router, TypeScript strict, `src/` directory |
| Styling | Tailwind CSS. Design tokens from section 2 go in the Tailwind theme, not scattered hex values |
| Fonts | `next/font/google`: IBM Plex Sans (400, 500, 600) and IBM Plex Mono (500) |
| Map | `maplibre-gl` + `react-map-gl` (MapLibre entry) with `deck.gl` layers (`@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/core`). DeckGL wraps the Map (the documented react-map-gl pattern) |
| Basemap | CARTO Dark Matter: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`. Keep its attribution visible (© CARTO, © OpenStreetMap contributors) |
| Charts | Recharts |
| Tests | Vitest for unit tests |
| Deploy | Vercel (no static export needed) |

The map uses WebGL and `window`, so the map component is a client component loaded with
`next/dynamic(..., { ssr: false })`.

No other runtime dependencies without asking. Added since, with approval: `pg` (History tab).

---

## 2. Design system (from the approved mockup)

A dark, map-first planning tool. Orange means fire, blue means stations. Numbers are set in
the monospace font. No gradients, no emoji, no drop-shadow cards, no left-border accent cards.

### Colours (Tailwind theme names)

| Token | Hex | Use |
|---|---|---|
| `ground` | `#0E1318` | page background, header |
| `map` | `#0B1015` | map area background |
| `panel` | `#121920` | side panel |
| `card` | `#18212A` | stat cards, bar tracks, segmented control background |
| `field` | `#161D24` | inputs and selects |
| `line` | `#222B34` | dividers |
| `line-strong` | `#2C3640` | input and button borders |
| `ink` | `#E9E6E0` | primary text |
| `ink-2` | `#C9CFD5` | body text in the panel |
| `muted` | `#A3ADB7` | labels, captions (passes 4.5:1 on `panel` and `card`) |
| `faint` | `#7E8994` | small footnotes only, never essential text |
| `fire` | `#F08A24` | fire dots, curve line, bars |
| `fire-text` | `#F2A65A` | fire-coloured numbers |
| `station` | `#5AA9E6` | stations, rings, selected states |
| `station-text` | `#7DBBEA` | station-coloured numbers |
| `station-bg` | `#1D3447` | selected tab and segment background |
| `neutral` | `#6B7682` | industrial heat sources, baseline bars |

Ring fill `rgba(90,169,230,0.10)`, ring stroke `rgba(90,169,230,0.55)`. On the Gaps tab only: fill 4%, stroke 30%.

### Type

- Base 14px. Panel headings 18px/600. Stat numbers 20–22px mono. Labels 12–13px `muted`.
- Line height 1.55 for paragraphs.

### Components

- **Stat card:** `card` background, radius 8px, padding 10–12px, big mono number on top, `muted` 12px label below.
- **Tab button:** min-height 36px, radius 6px, 1px `line-strong` border, 12px text, 6px horizontal padding, 4px gap; selected = `station` border + `station-bg` fill + `ink` text. The button shows the tab's short label; the full name is its `aria-label` and tooltip.
- **Segmented control:** `card` track with 4px padding; selected segment = `station-bg` fill + 1px `station` outline.
- **Horizontal bar:** `card` track, radius 4px, height 10–12px, fill `fire` (or `station`/`neutral` where noted), value in mono at the right.
- **Inputs/selects:** `field` background, `line-strong` border, radius 6px, min-height 40px.
- Touch targets at least 40px. Every control is a real `<button>`, `<input>` with `<label>`, or `<select>`.

### Layout

- **Header** (`ground`, bottom border `line`): one row, 56px tall. Left: "FirstDue" (20px/600), no subtitle.
  Right: two selects, "Fires shown" (All years, 2019…2023) and "Fire centre" (All of BC + the six regions).
  While a filter is active, the filter note (section 5) sits on the same row left of the selects: the sentence from
  1100px wide, an info icon carrying it as tooltip and `aria-label` below that. It never adds height.
- **Body:** from 960px wide, the map fills the space left of the side panel. The panel (`panel` background, left
  border `line`, scrolls internally) is **480px by default and resizable** between 320px and 60% of the window:
  an 8px drag handle on its left edge (`role="separator"`, 2px `station` line on hover, focus and drag; arrow keys
  move it 40px), and an icon button at the end of the tab row toggling between the current width and 60%
  ("Expand panel" / "Restore panel width"). The width is remembered in `localStorage` (`firstdue.panelWidth`),
  falling back to 480px. The map resizes live (ResizeObserver → MapLibre `resize()`).
  Below 960px the panel stacks under the map (map height 60vh there), with no handle or button.
- **Map overlays** (`rgba(22,29,36,0.92)` background, 1px `line-strong` border, radius 8px):
  top-left "Current layout" chip (tab-dependent summary line); bottom-left legend; bottom-right map attribution (MapLibre's control is fine).
- **Panel:** tab row at the top, then the active tab's content with 18–20px padding and 16–18px gaps.
  At the default 480px width all tabs and the expand button fit on one row; narrower panels may wrap.
- **Larger view dialog** (`LargerViewDialog`, shared by History and About): a modal `<dialog>` about 90% × 85% of
  the window on the `panel` background, with a title, a close button and Escape to close. Focus moves to the
  close button on open, is trapped while open, and returns to the "Open larger view" button on close.

---

## 3. Data loading

- `src/lib/data.ts`: fetch the nine files from `/data/*.json` once, in parallel. Throw a readable error if any file fails or if `schema_version !== SCHEMA_VERSION`.
- A `DataProvider` (React context) exposes all nine typed objects plus derived lookups: `candidatesById`, `firesByRegion`, the hall `cand_id` list (`kind === "hall"`).
- Loading state: a centred "Loading fire data…" in the panel and an empty map. Error state: the message plus "Check that web/public/data/ contains the exported files."
- **Curves are always looked up by `k`, never by array index** (the fair curve starts at K = 6). Write one helper `curvePoint(curve, k)` and use it everywhere.

## 4. Formatting helpers (`src/lib/format.ts`)

- `pct(x, digits = 1)` → `"37.7%"`; `null` → `"—"`.
- `mins(x)` → `"114 min"` (0 decimals in cards, 1 in tables).
- `int(x)` → thousands separators.
- `siteName(c)` → `c.name ?? (c.kind === "hall" ? "Unnamed fire hall" : "Unnamed place")`.
- All stored shares are fractions 0–1 (contract). `gap_points` in evidence is already in percentage points: show it as `"0.08 pts"`.

## 5. Global app state

Keep in one small React context or `useReducer` (no state library):
`tab`, `yearFilter` ("all" or a year), `regionFilter` ("all" or a region), `q1Variant` ("capped_pmedian" | "fair"),
`k` (1–60; for fair, at least 6), `trucksPerStation` (1–10, default 2), `editedLayout` (cand_id[] | null),
`selectedStation` (cand_id | null), `hallTruckMode` ("need" | "2x"), `gapThreshold` (30 | 60 | 90), `evidenceK` (10 | 20 | 40).

**Filters only change what the map draws.** Every number in the panel is the all-years, all-BC result from the JSON.
While a filter is active, show the note "Filters change the map only; scores cover all of BC, 2019–2023." in the header row (see Layout).

---

## 6. Map layers (deck.gl)

Initial view: longitude −125.0, latitude 54.5, zoom 4.6, pitch 0. Max bounds roughly lon −142 to −110, lat 47 to 61.

| Layer | Source | Look |
|---|---|---|
| Fires | `fires.json`, filtered by year/region | ScatterplotLayer, `radiusUnits: "meters"`, radius `700 + weight × 120` m, `radiusMinPixels: 1`, `radiusMaxPixels: 6`, so dots grow with zoom. Reachable: filled `fire`. Unreachable: no fill, 1px `fire` stroke. Opacity per tab below. |
| Industrial sources | `static_fires.json` | 3px squares or circles in `neutral`. Hidden on the About and History tabs. |
| Candidates | `candidates.json` | 3px `muted` dots at 50% opacity. Only visible while a station is selected for moving. Pickable then. |
| Rings | current layout | ScatterplotLayer, `radiusUnits: "meters"`, radius `reach_km × 1000` (from `meta.settings` or `gaps.thresholds` on the Gaps tab), ring fill and stroke from section 2 (lighter on Gaps). |
| Heat | History tab | One dot per 0.1° cell from `/api/history/cells`, `fire` at 60% opacity, 1.5–16px with area tracking the detections. Replaces the fire dots on History. |
| Stations | current layout | 11px `station` dot with 2px `ink` outline. Selected station: 15px with `fire-text` outline. Pickable. |
| Halls | Q3 tab | 8px squares in `station`; size scales with trucks in the chosen truck mode (8–16px). |
| Next stations | Q3 tab | 12px hollow `station` circles with a rank label (TextLayer, mono, 11px). |

Hover tooltips (deck.gl `getTooltip`): fire → id, date, weight, nearest minutes, region; station/hall → name, kind, region, and trucks where relevant.

What each tab draws:

| Tab | Layout shown | Fires (reachable / unreachable opacity) |
|---|---|---|
| Overview | none | all (filtered), 85% / 100% |
| Place stations | Q1 layout at K (or the edited layout) | all, dimmed to 40% / 55% so stations and rings stand out |
| How many | Q2 layout at `k_star`, station size scaled by trucks (11–19px) | all, 40% / 55% |
| Existing halls | halls + next 20 | all, 40% / 55% |
| Gaps | **every candidate**, rings at the 60-minute reach | 25% / 100% |
| About | none | all at 50% |
| History | none | none; the heat layer instead |
| Ask | none | as Overview |

---

## 7. Tabs

Tab order, with the short label shown on the button in brackets where it differs: **Overview · Place stations (Place) ·
How many · Existing halls (Halls) · Gaps · About · History · Ask about the results (Ask)**. The default tab is Place stations.
History appears only when the history database is configured. The former Evidence tab is now the first part of About.
Ask is planned (section 7.10) and not built yet.

### 7.1 Overview
- Heading "What this answers" and the paragraph: "Five years of satellite fire detections, grouped into {meta.counts.fires} fires. {meta.counts.candidates} possible sites: every town and existing fire hall. For any number of stations, the tool finds where they reach the most fires within an hour by road."
- Four stat cards: fires (`meta.counts.fires`, "fires, 2019–2023"), candidates ("candidate sites"), `meta.ceiling.all_years` ("best possible, every site open"), `gaps.overall.unreachable_weight_share` ("of fire weight beyond an hour of any site").
- Map chip: "{fires} fires · {candidates} possible sites".

### 7.2 Place stations (Q1)
- Segmented control: "Fastest response" (`capped_pmedian`) / "Fair: one per fire centre" (`fair`). Switching to fair with K < 6 sets K to 6.
- Slider "Number of stations", K from 1 (fair: 6) to `q1.k_max`, step 1, with "K = {k}" in mono. Keyboard accessible.
- Three stat cards from `curvePoint(variant.curve, k)` (or the live score when edited): coverage ("fire weight within 60 min"), relative ("of the reachable ceiling"), mean_min ("average response").
- **Validation line** (small, `muted`): if the variant is `capped_pmedian` and K ∈ {10, 20, 40, 60}, show "Chosen on 2019–2022 fires, this layout reached {test_relative} of the 2023 ceiling." from `evidence.q1_variants`. Otherwise: "Tested on unseen 2023 fires at K = 10, 20, 40 and 60 (see About)."
- Trucks: number input "Trucks per station" (1–10) and "= {k × trucks} trucks in total".
- Coverage chart (Recharts line, height about 140px): x = K over the variant's curve, y = coverage; dashed reference line at `meta.ceiling.all_years` labelled "ceiling, every site open"; a dot at the current K.
- Per-region bars at the current K: for each region, `by_region[region].relative` (share of that region's own ceiling), with coverage in a tooltip or second column.
- Drag-a-station hint at the bottom: "Click a station, then any site on the map, to move it."
- Map chip: "{k} stations · {coverage} of fire weight within 60 min".

### 7.3 Drag-a-station (part of Place stations)
- Click a station → it's selected and candidates appear. Click a candidate → replace the selected station with it in `editedLayout` (no duplicates; clicking an already-open site does nothing). Click empty map or press Escape → deselect.
- While `editedLayout` exists, the three stat cards and the per-region bars use `scoreLayout(fires, open, meta.settings, meta.ceiling.all_years)`, computed in a `useMemo`. Per-region numbers come from scoring each region's fires against that region's ceiling (`meta.ceiling.by_region`).
- Each card shows the change from the optimized value, e.g. "+1.2 pts" or "−0.8 pts" (green/red is not allowed; use `station-text` for better and `fire-text` for worse, plus the sign).
- A "Reset to optimized" button appears while edited. Changing K or the variant resets edits.
- `scoreLayout` throws on an empty layout; the UI can never produce one, but guard anyway.

### 7.4 How many (Q2)
- Heading "How many stations, and how many trucks?" and the explanation: "The fewest stations that reach {target_relative} of what is reachable at all, with trucks sized to how many fires each station sees burning at once on a busy day."
- If `k_star` is null: a card saying the target is not reached within {k_max} stations, and the curve only.
- Stat cards: `k_star` ("stations needed"), `total_trucks` ("trucks in total"), coverage at `k_star` from the curve ("fire weight within 60 min").
- Chart: Q2 curve to `k_max` with vertical reference lines at `k_star` ("95% of ceiling") and `elbow_k` (labelled "diminishing returns (K 1–60)"), plus the ceiling line.
- Region table from `by_region_at_k_star`: region, stations, trucks, coverage, relative.
- Station list: `stations` sorted by trucks descending, then `k`: name, region, trucks, fires covered, peak at once. Scrollable box (max height about 320px). Hovering a row highlights the station on the map.
- Map chip: "{k_star} stations · {total_trucks} trucks".

### 7.5 Existing halls (Q3)
- Heading "Today's fire halls".
- Headline card (if `matching` is not null): "{matching.k} well-placed stations reach as many fires as the {n halls} existing halls." Under it, in `muted`: "Over 2019–2023. Fitted on 2019–2022 only, the dense hall network held up better on 2023 ({evidence.q3_split.halls_test} vs {optimized_test}) because the fires moved north."
- Stat cards: halls coverage, relative, mean minutes (`q3.score`).
- Truck segmented control: "Need by load" (`trucks_need`, total `need_total`) / "Budget: 2 per hall" (`trucks_2x`, total `budget_2x`). Show the total for the chosen mode, and the count of halls covering no fire (`fires_covered === 0`).
- Region table from `score.by_region`: region, halls, coverage, relative.
- Next 20 list: rank, name, region, "+{gain} pts". Hover highlights on the map.
- A note in `faint`: "OpenStreetMap fire halls are mostly municipal, not BC Wildfire Service bases."
- Map chip: "{n halls} halls · {coverage} of fire weight within 60 min".

### 7.6 Gaps
- Heading "Where trucks can't reach" and the paragraph: "{overall unreachable share} of fire weight is more than {threshold} minutes by road from every town and fire hall in BC. Prince George holds most of it. This is air-attack territory." (Use the region with the most unreachable fires from `by_region`, not a hardcoded name.)
- (Built as a static panel, with no threshold control: the rings are always the 60-minute reach and the 60-minute card is highlighted.) A `faint` footnote says the hollow fires are those beyond 60 minutes of every site.
- Three cards from `gaps.thresholds`: ceiling at each threshold ("reachable in {t} min").
- Region table: region, fires, unreachable fires, unreachable weight share.
- Map chip: "Every site open · {threshold}-minute reach".

### 7.7 About, part 1: evidence (formerly the Evidence tab)
The About tab starts with an "Open larger view" button, then this section, then section 7.8.
- Heading "Does it work on fires it never saw?" and: "Stations chosen from 2019–2022 fires, scored on 2023."
- (Built as a static panel at K = 20, with no K control.) Bar chart (horizontal bars) of `test_relative` for that K: capped p-median and greedy coverage in `station`; random best, random median and most populous towns in `neutral`. Labels: "Our layout", "Coverage-first layout", "Best of 1,000 random", "Typical random", "Biggest towns".
- Line under the chart: "Ours beat {beats_random_coverage_share} of 1,000 random layouts." Then: "Placing stations in the biggest towns does worse than random: they cluster in the southwest, away from the fires."
- Leave-one-year-out table: held-out year, coverage, ceiling, relative; plus "Site overlap between folds: {mean_jaccard} (sites change, but stations per fire centre stay stable)" and the region-stability table (region, per-fold counts, mean, std).
- "Is greedy close to optimal?" table from `exact_check.coverage`: K, greedy, exact, gap in points; plus the p-median status note.
- Fairness table, weight sensitivity line, overload line ("In 2023, {overloaded_share} of station-days had more fires than trucks; the worst station peaked at {peak_active} fires against {trucks} trucks.").

### 7.8 About, part 2: data and limits
- "Data and limits" with these paragraphs (plain text):
  - Where should BC base its wildfire trucks? Built on NASA satellite fire detections, 2019–2023. (The former header subtitle.)
  - Fires: NASA FIRMS VIIRS 375 m active-fire detections (S-NPP; a 2022 outage filled from NOAA-20), grouped into fires. Industrial heat sources removed.
  - Sites: OpenStreetMap towns and fire halls (© OpenStreetMap contributors).
  - Travel time: straight-line distance × {detour} at {speed_kmh} km/h plus {dispatch_min} minutes to roll out. Remote areas look closer than they are by road.
  - Fire halls are mostly municipal, not BC Wildfire Service bases. A fire counts as active for up to 14 days after detection.
  - Method: facility location (greedy p-median and maximal coverage), validated on a held-out year.
- Settings values come from `meta.settings`.
- **Larger view:** the button opens the shared dialog titled "About FirstDue" with the same content in two columns
  from 1200px wide (evidence left, data and limits right) and one column below that.

### 7.9 History (built in F11)
- Heading "Fire history", two date inputs (2019-05-01 to 2023-10-31, at most 184 days, default 2023-07-01 to
  2023-09-30), Load, and "Open larger view". The dates are shared state between the tab and the dialog.
- Two stat cards (satellite detections, ignitions), a daily-detections chart with one line per fire centre and
  the per-centre totals under it, and the note "Live from Tiger Data (TimescaleDB): 538,508 detections, daily
  continuous aggregates."
- **Larger view:** the shared dialog titled "Fire history" with the same form, the chart at full width and about
  48% of the dialog height with a date axis and a legend, the two cards, and a table of detections per fire centre
  sorted largest first with shares. It fits without scrolling at 1440×900 and never refetches on open.
- Map chip: "{detections} satellite detections · {start} to {end}".

### 7.10 Ask (planned)
An eighth tab, short label "Ask", full name "Ask about the results": plain-English questions answered by Gemini from
FirstDue's computed results only, through a server-side route handler. To be specified here once built.

---

## 8. Accessibility and quality

- All text contrast at least 4.5:1 (3:1 for 24px+). Never rely on colour alone: unreachable fires are hollow, not just a different colour.
- Keyboard: tabs, segmented controls, slider, selects and lists all work with Tab/Enter/arrows. Escape deselects a station.
- `aria-label` on icon-only buttons; the map container has an `aria-label` describing what is shown.
- Respect `prefers-reduced-motion` (no animated transitions when set).
- No console errors or warnings in the browser during normal use.

---

## 9. Build steps (one per session)

Every step ends with the **gate**: `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` all pass, plus the step's manual checks in `npm run dev`. Commit after each step. Report what was built, the gate results and anything that deviated.

**F1. Scaffold and migrate.** Before this step, the old `web/` folder has been renamed to `web-tmp/`. It holds `src/types/data.ts`, `public/data/` (the nine exported JSON files), `FRONTEND_SPEC.md`, and possibly `design/mockup-reference.html` or a design handoff bundle.
1. Confirm `web/` does not exist and `web-tmp/` does. Record SHA-256 hashes of every file in `web-tmp/`.
2. Create the Next.js app in a fresh `web/` with `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/` directory, `@/*` import alias, npm). Don't create a nested git repo; the repo root's git stays the only one.
3. Move the files into place: `web-tmp/src/types/data.ts` → `web/src/types/data.ts`; `web-tmp/public/data/*.json` → `web/public/data/`; `web-tmp/FRONTEND_SPEC.md` → `web/FRONTEND_SPEC.md`; any design reference or handoff files → `web/design/`. Use `git mv` for files git already tracks.
4. Verify every moved file's hash matches step 1, then delete `web-tmp/`. If any hash differs or a file is missing, stop and report; don't delete anything.
5. Check `.gitignore` (root and `web/`): `node_modules`, `.next` and `.env*` are ignored; `web/public/data/` is **not** ignored.
6. Install the section 1 dependencies. Set up the Tailwind theme with section 2's tokens and the fonts. Remove create-next-app's demo page and styles.
7. Build the static shell: header with the two selects, map area placeholder, side panel with the seven tabs switching empty content.

Manual: the layout matches section 2 at desktop width and stacks on a narrow window; `web/public/data/` holds the nine JSON files; `web-tmp/` is gone.

**F2. Data layer.** `lib/data.ts`, `DataProvider`, `format.ts`, `curvePoint`, the state from section 5, loading and error states. Unit tests: schema-version check rejects a wrong version; `curvePoint` finds K = 6 in the fair curve and returns undefined for K = 5; `pct`/`mins` edge cases; **conformance**: `scoreLayout` on the first 20 capped picks reproduces the stored K = 20 coverage, relative (within 0.0001) and mean minutes (within 0.1) from the real JSON. Manual: the Overview tab shows the real numbers.

**F3. Map.** The map component (client-only), basemap with attribution, fires and industrial-source layers, tooltips, and the year/region filters (with the "filters change the map only" note). Manual: fires appear across BC, unreachable fires are hollow, filters change the dots, no console errors.

**F4. Place stations.** Section 7.2 complete, with rings and station layers. Manual: moving the slider moves stations and updates cards and chart; switching to fair at K < 6 jumps to 6; the validation line changes at K = 10/20/40/60.

**F5. Drag-a-station.** Section 7.3. Unit test: replacing a station in a layout never creates duplicates. Manual: select a station, move it, cards show deltas, Reset restores the stored numbers exactly.

**F6. How many.** Section 7.4. Manual: K\* and elbow lines on the chart, station list sorted by trucks, hover highlight works.

**F7. Existing halls.** Section 7.5. Manual: the truck-mode switch changes hall sizes and totals; the next 20 show ranks on the map.

**F8. Gaps.** Section 7.6. Manual: the threshold switch resizes every ring; unreachable fires stand out.

**F9. Evidence and About.** Sections 7.7 and 7.8. Manual: every number matches `evidence.json` and `meta.json`. (Evidence was later merged into About.)

**F10. Polish.** Responsive check at 1440, 1024 and 390px; keyboard pass; reduced motion; empty and error states; page `<title>` and description; favicon (simple orange dot). Add a `web/README.md` with setup, `npm run dev`, how to refresh data (re-run notebook 06a), and Vercel deploy steps (root directory `web`).

**F11 (optional, later). Fire history (Tiger Data).** A History tab and `app/api/history/*` route handlers using `pg` with `TIGER_DATABASE_URL` (server-side only), running the three queries from `notebooks/tiger_queries.sql` with `%(start)s`/`%(end)s` converted to `$1`/`$2`. The tab only appears when the API reports the database is configured; otherwise it is hidden. A date-range picker drives a daily-detections-by-region chart and a heat layer from cell totals.
