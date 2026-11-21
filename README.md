# Storm Chaser

Live storm-tracking web app. It pulls current conditions from
[Open-Meteo](https://open-meteo.com) for six North American cities, scores each
one on a storm-severity scale, and presents them in three views:

| Tab | What it shows |
| --- | --- |
| **Weather map** | Leaflet map of every tracked area — storm circles or a pressure layer, tap a marker to open its area |
| **Storm Radar** | Canadian pressure stations with RainViewer radar overlay, low-pressure list and a nearest-station card |
| **Area list** | Severity-sorted list of areas; each opens `/area/$id` with current conditions, stats and an 8-hour outlook |

> This project is connected to Lovable — see [Lovable workflow](#lovable-workflow)
> before rewriting git history. Built with TanStack Start, TanStack Router,
> TanStack Query, React 19, TypeScript, Tailwind CSS 4 and Leaflet.

## Weather map

`src/routes/index.tsx` → `src/components/storm/LazyMap.tsx` → `src/components/storm/StormMap.tsx`

The map is created once per mount and styled from the CSS custom properties in
`src/styles.css`, so the severity palette lives in one place (`--sev-*`,
`--pressure-*`).

**Storms layer** (`mode="storm"`, the default)

- Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (© OpenStreetMap).
- One `L.circleMarker` per area at its station coordinates, coloured by
  `--sev-<severity>`, radius `10 + wind / 8` pixels so windier cells look larger.
- Hover tooltip: `name · condition · temp° · gusts km/h`.
- Click → `navigate("/area/$id", { id })`.

**Pressure layer** (`mode="pressure"`)

- One circle marker per area, coloured by the `--pressure-low/mid/high` band,
  total radius 14 px, with a **permanent** tooltip showing the hPa value.
- Below the map, a card lists areas sorted by pressure ascending with the
  Low < 1000 / Normal / High > 1020 legend.

**Start view / centre**

- With a `focus` (area detail screen) the map opens at that point at zoom 7.
- Otherwise it opens at the resolved centre at zoom 4, or Toronto if location is
  unavailable.

### Severity scoring

`severityFrom(gust, rain, code)` in `src/lib/storms.ts` — first matching rule
wins:

| Severity | Trigger (any of) | CSS variable |
| --- | --- | --- |
| `extreme` | gusts ≥ 118 km/h, or WMO code 99 | `--sev-extreme` |
| `severe` | gusts ≥ 90 km/h, code 96, or rain ≥ 15 mm/h | `--sev-severe` |
| `warning` | gusts ≥ 70 km/h, code 95/82, or rain ≥ 7.5 mm/h | `--sev-warning` |
| `watch` | gusts ≥ 50 km/h, rain ≥ 2.5 mm/h, or codes 65/67/75/81/86 | `--sev-watch` |
| `calm` | none of the above | `--sev-calm` |

Severity also drives the badge colour and the safety summary shown on the detail
screen (`summaries` in `storms.ts`).

## Storm Radar

`src/routes/index.tsx` (tab `pressure`) → `src/components/storm/LazyPressureMap.tsx`
→ `src/components/PressureMap.tsx`

- **Station markers** — 18 Canadian cities (`CITIES` in `src/lib/pressure.ts`),
  rendered as pill pins showing the hPa number, styled `pin-low` / `pin-high` /
  `pin-normal` by band.
- **Popups** — sea-level pressure, surface pressure, temperature, status, and a
  three-point pressure history sparkline (`pressureHistoryChart`).
- **RainViewer radar** — the latest past radar frame from
  `api.rainviewer.com/public/weather-maps.json`, at 70 % opacity with a
  "Rain intensity" legend, toggleable from the Leaflet layer control.
- **Recentre control** — bottom-right locate button (`resetView` on
  `PressureMapHandle`); on screens < 640 px wide the map fits all of Canada
  instead of centring a single point.
- **Tap the map** to fetch the pressure reading for that exact point
  (`Point 45.12, -73.55`), and the card reports the nearest station.
- **Selecting a station** from the list flies to it and opens its popup.
- Status bands: `Low` < 1009 hPa, `Normal`, `High` > 1022 hPa.

## Area list and area detail

`Area list` tab — sorted by `severityRank` descending, then gusts descending.
Each row shows name, severity badge, region, condition, temperature and gust
speed.

`/area/$id` — `src/routes/area/$id.tsx`

- The place comes from the route loader (`getPlace`); an unknown id renders the
  not-found route.
- A focused map (zoom 7) with all areas drawn but centred on this one.
- Live temperature, condition, severity summary.
- Stats: wind, gusts, rain (mm/h), pressure, humidity, 8-hour peak gusts.
- "Next 8 hours · rain" bar chart from the hourly Open-Meteo data.

## Tracked areas

| id | Area | Region | Lat | Lng |
| --- | --- | --- | --- | --- |
| `toronto` | Toronto | Ontario | 43.65 | −79.38 |
| `buffalo` | Buffalo | New York | 42.89 | −78.88 |
| `chicago` | Chicago | Illinois | 41.88 | −87.63 |
| `miami` | Miami | Florida | 25.76 | −80.19 |
| `halifax` | Halifax | Nova Scotia | 44.65 | −63.57 |
| `denver` | Denver | Colorado | 39.74 | −104.99 |

Add a city by appending to `places` in `src/lib/storms.ts` — the map, list and
detail route all derive from it.

## How data flows

```
Open-Meteo forecast ─► fetchLiveAreas()  ─► useQuery(["live-areas"])
      (6 places, one request)                    refetch every 10 min
                                                 stale after 5 min
                                          ├─► StormMap / PressureMap circles
                                          ├─► Area list rows
                                          └─► /area/$id stats + 8h chart

Open-Meteo forecast ─► fetchReadings()   ─► useState in the Storm Radar tab
      (pressure_msl, surface_pressure,      fetched once on mount, then
       temperature_2m, hourly history)      on every map tap
RainViewer          ─► radar tile layer   ─► Storm Radar tab
navigator.geolocation ─► initialCenter()  ─► map centre (Toronto fallback)
```

Geolocation is only used when the device is inside the rough Canada/US box in
`src/lib/geo.ts` (lat 20–72, lon −141…−50); `initialCenter()` never rejects.

## Running it

### Requirements

- **Node.js 22+** (Vite 8 and TanStack Start need a modern runtime; Node 20
  prints warnings and may fail to install).
- **bun** is the committed package manager (`bun.lock`, `bunfig.toml`) —
  `bun install` is the supported path. `npm i` works as a fallback if you do not
  have bun; do not mix lockfiles in one checkout.

### First run

```sh
git clone <this-repository-url>
cd StormChaser
bun install          # or: npm install
bun run dev          # or: npm run dev
```

The Lovable Vite config defaults the dev server to **port 8080**, so open
<http://localhost:8080>. If 8080 is already taken, Vite falls back to the next
free port (e.g. 8081) and prints the real URL — use the one in the terminal.

### Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | Start the dev server with SSR |
| `bun run build` | Production build |
| `bun run preview` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run test` | Vitest once |
| `bun run test:watch` | Vitest in watch mode |

### Fastest check: unit tests

```sh
bun run test
```

Expect 6 passing tests: `severityFrom` thresholds (`src/test/severity.test.ts`)
and the `/` route resolving to a real page instead of the not-found fallback
(`src/test/app-routing.test.tsx`).

## Boot-up testing checklist

Run these against `bun run dev` in a desktop browser, then again in a phone-sized
window (< 640 px) or with device emulation.

### 1. The app loads

- [ ] Header reads **"N of 6 areas under watch"** with an "Updated HH:MM:SS"
      line. `0 of 6` is a valid result — it counts non-calm areas.
- [ ] Beneath it: "Centred on your location" (after allowing location) or
      "Showing Toronto (default)".
- [ ] No error banner ("Weather unavailable", "Pressure data unavailable").
- [ ] Console has no errors from `api.open-meteo.com` (429/500s show up here).

### 2. Weather map — storms layer

- [ ] OSM tiles render; the map is not a grey box.
- [ ] Six coloured circles are visible (green on a quiet day is expected).
- [ ] Hovering a circle shows `name · condition · temp · gusts`.
- [ ] Larger wind ⇒ visibly larger circle.
- [ ] Clicking a circle opens `/area/<id>` for the right city.

### 3. Weather map — pressure layer

- [ ] Clicking **Pressure** re-colours markers by pressure band.
- [ ] hPa tooltips are permanently visible on each marker.
- [ ] The pressure card lists all six areas sorted ascending by hPa.

### 4. Storm Radar

- [ ] The map opens on Canada (mobile) or your location (desktop) with 18
      numbered station pins.
- [ ] Radar overlay is present and the "Rain intensity" legend shows; toggling
      "Storm radar" in the layer control hides/shows both.
- [ ] The locate button (bottom-right) recentres the map.
- [ ] Clicking a station in the list flies to it and opens a popup with sea-level
      / surface pressure, temp, status and a tiny history chart.
- [ ] Clicking an empty part of the map adds a `Point …` reading and the card
      shows the nearest station.
- [ ] List is sorted by lowest pressure first and badge says Low / Normal / High.

### 5. Area list and detail

- [ ] List is ordered most severe first (badges: Extreme → Severe → Warning →
      Watch → Calm).
- [ ] Opening an area shows its map zoomed to the city, temp, condition,
      summary, six stats, and eight rain bars labelled with hours.
- [ ] Visiting `/area/nowhere` shows the not-found page, not a crash.
- [ ] The "← All areas" link returns to the list.

### 6. Responsiveness and reload

- [ ] At < 640 px the Storm Radar tab still fits Canada in view.
- [ ] Reloading `/area/toronto` directly works (SSR, not just client nav).
- [ ] Backgrounding the tab for > 10 min refetches areas on focus.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Map area is blank or grey | Tiles blocked (offline / proxy). Leaflet is client-only via `ClientOnly`; a hydration fallback (pulsing block) that never resolves means the lazy chunk failed to load. |
| Markers are all one colour | `--sev-*` / `--pressure-*` variables missing from `src/styles.css`; `getComputedStyle` returns an empty string and Leaflet falls back to black. |
| `Cannot find module '@tanstack/...'` after install | Mixed lockfiles — delete `node_modules` and reinstall with one manager. |
| Dev server is on 8081, not 8080 | Something else holds 8080; Vite logs `Port 8080 is in use, trying another one…` and prints the port it actually used. |
| `429` from Open-Meteo | Rate limited; wait, or reduce the number of places in `places`. |
| Radar overlay never appears | RainViewer request is best-effort and silently skipped on failure; the app still works without it. |

## Project layout

```
src/
  routes/
    __root.tsx          shell, providers
    index.tsx           the three tabs: Weather map / Storm Radar / Area list
    area/$id.tsx        area detail with focused map, stats, 8h rain chart
  components/
    PressureMap.tsx     Leaflet pressure + radar map (imperative handle)
    storm/
      StormMap.tsx        Leaflet storm/pressure circles
      LazyMap.tsx         ClientOnly + lazy wrapper for StormMap
      LazyPressureMap.tsx ClientOnly + lazy wrapper for PressureMap
      SeverityBadge.tsx   severity pill
      ConditionIcon.tsx   pressure band icon
  lib/
    storms.ts           places, severity scoring, Open-Meteo area fetch, query
    pressure.ts         pressure stations, bands, history
    pressure-chart.ts   popup sparkline
    geo.ts              device centre with Toronto fallback
  test/                 vitest specs
  styles.css            theme tokens incl. --sev-* and --pressure-*
```

## Lovable workflow

This project is connected to Lovable. Do not force-push or rewrite published
history — it breaks the Lovable side of the link and can lose project history.
Schema changes and generated files are handled in Lovable; keep `LOVABLE_API_KEY`
and other secrets out of the repository.

## Attributions

- Weather data: [Open-Meteo](https://open-meteo.com) (CC BY 4.0)
- Radar: [RainViewer](https://www.rainviewer.com)
- Map rendering: [Leaflet](https://leafletjs.com); tiles ©
  [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
