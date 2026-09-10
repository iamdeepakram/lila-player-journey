# Architecture — LILA Player Journey tool

This file is the stack decision, data pipeline, coordinate mapping, and what we are **not** building yet. UI details will grow as phases ship. The assignment asks for one page of decisions; the longer comparison is kept here so the reasoning is not lost.

## What we are building with (now)

| Layer | Choice | Why |
|---|---|---|
| Data | Offline Python ETL → static JSON | 89k rows. Browser must not parse 1,243 parquet files. |
| App shell | Vite + React + TypeScript | Filters, legend, and match state are UI. Static hosting. |
| Map renderer | Canvas 2D in `src/mapRenderer.ts` | One match, tens of actors, 1024×1024 minimap. `requestAnimationFrame` later for playback. |
| Hosting | Static (Vercel) | Shareable link, no Python process. |

**Swap rule:** the shell never draws pixels. `MapRenderer` is `{ setMatch, setTime, setLayers, draw }`. If Canvas 2D janks, replace the file with PixiJS. JSON schema and filters stay.

## Data flow

```
player_data/** parquet
    → scripts/etl.py
    → public/data/index.json          (match list + map config)
    → public/data/matches/{id}.json   (actors + story events, px/py baked)
    → public/data/heat/*.json         (64×64 sparse grids)
    → public/minimaps/*               (images)
    → React app fetches JSON, canvas draws
```

The browser never reads parquet.

## Coordinate mapping

World `(x, z)` → minimap pixels. `y` is elevation and is ignored.

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale
px = u * 1024
py = (1 - v) * 1024    # image origin is top-left
```

| Map | scale | origin_x | origin_z |
|---|---|---|---|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

ETL bakes `px`/`py` so the UI cannot drift from this formula. Verified: a stitched AmbroseValley match lands on terrain, not mirrored.

## Time

Parquet type is `timestamp[ms]`, so pandas shows `1970-01-21` and ~0.4s matches. Raw int64 values are **Unix seconds** (Feb 2026). Duration = `max(ts_raw) - min(ts_raw)`. Match `t` is seconds from that minimum. Date in the index is UTC date of `t0` (one match falls on `2026-02-09` UTC). Folder names are not match dates; files can appear in two days.

## Assumptions

- Dedupe actors on `(user_id, match_id)` — duplicate human file across Feb 10/11.
- UUID `user_id` = human; numeric = bot.
- README is incomplete: bot files also carry `BotKill` / `BotKilled`.
- No extract event. “Loot on the way to extract” is not directly answerable.
- Feb 14 is a partial day (`partial_day` on those matches).
- Kill vs Killed are two positions (killer vs victim) in two files.

## Tradeoffs

| Option | Decision | Why |
|---|---|---|
| Streamlit | No | Rerun model is a bad fit for playback. Looks like a DS notebook. Needs a live Python host. |
| PixiJS / WebGL now | No | Right for thousands of sprites. Wrong for 8 bots on a minimap. Add behind `MapRenderer` if Canvas 2D drops frames. |
| Vue / Svelte | Not now | Same architecture as React. React is the most familiar review surface. |
| MapLibre/Leaflet | No | This is an image overlay, not GIS. Our UV math is already the projection. |
| Warehouse / Spark | No | Dataset is ~8MB. |
| Parquet in the browser | No | Fragile first paint; ETL is the product API. |
| Show all 796 matches at once | No | Unreadable. Default: one map, one date, one match. |

## Future scale (not in assignment scope)

If this became a live LD tool: keep the JSON contract; run ETL on a schedule into object storage; add a small index API when `index.json` is too big; precompute heat tiles; swap Canvas 2D → PixiJS (or MapLibre) inside `MapRenderer` only.

Features we are **not** building now: live ingest, designer comments, compare-two-days, storm mesh, clip export, auth. The schema can grow events without changing the shell.

### App shell (if we had to choose again)

| | Streamlit | React + Vite | Vue + Vite | Svelte + Vite | Plain HTML |
|---|---|---|---|---|---|
| Designer UX | Weak | Strong | Strong | Strong | Strong if designed |
| Playback + layers | Fights rerun | Natural | Natural | Natural | You write it |
| Future routes/compare | Painful | Easy | Easy | Easy | Messy |
| Host Pixi later | Hard | Easy | Easy | Easy | Easy |
| Take-home signal | DS demo | Product tool | Product tool | Product tool | Simple tool |
| Use for this repo | No | **Yes** | Fine | Fine | Fine if UI stays one screen |

React vs Vue vs Svelte is not a scalability decision. All three can host a canvas.

### Renderer (if we had to choose again)

| | Canvas 2D | PixiJS | MapLibre | Plotly/Streamlit |
|---|---|---|---|---|
| 1 match, tens of actors | **Perfect** | Overkill | Overkill | Awkward |
| 60fps scrub | Easy | Easy | Easy | Poor |
| 5k paths / effects | Will jank | Why Pixi exists | Tiles | No |
| Take-home risk | Low | “Why WebGL?” | “Why a map engine?” | DS demo |
| Swap later | Starting point | Next step | If world pan/zoom | Dead end |

## Phase plan

1. **ETL** — done.
2. **UI** — map, paths, markers, filters, playback, heatmaps — done.
3. **Host + README + insights** — see live URL in README.
