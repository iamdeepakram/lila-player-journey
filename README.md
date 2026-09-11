# LILA BLACK — Player Journey tool

Web tool for Level Designers: see how players move, fight, loot, and die on LILA BLACK maps.

**Live:** https://lila-player-journey-sage.vercel.app  
**Repo:** https://github.com/iamdeepakram/lila-player-journey

## 60-second walkthrough

[Watch the recording](docs/walkthrough.mp4) — Ambrose Valley heat and playback, then Lockdown and Grand Rift.

What you will see:

1. Land on **AmbroseValley / 2026-02-10**. Traffic heat makes the empty east side obvious.
2. **Play at 4x** so the human (cyan) and bots (orange) draw on the minimap.
3. Turn on **Kill zones** and **Storm death** heat.
4. Switch **Map** to Lockdown, play again, then Grand Rift.

## Walkthrough (step by step)

1. Open the live URL (or `npm run dev`). You land on **AmbroseValley / 2026-02-10** and a real match (`1H / 6B · 382s`).
2. **Traffic heat** is on. The cyan wash is where humans walked that day. The east side of Ambrose Valley is empty.
3. **This match** overlay: cyan = human path, orange = bots, yellow squares = loot, red marks = deaths/kills.
4. Hit **Play**. The path draws from t=0. Use **2x/4x** or the scrubber.
5. Toggle **Kill zones / PvP death / Storm death** under *Map / date heat*. Storm is a handful of cells, not a front.
6. Change **Map** to Lockdown, then Grand Rift — images and heat follow the filter.
7. Change **Match** — the dropdown is `humans / bots · duration · kills`, not raw UUIDs.

## Stack

- Python ETL (`scripts/etl.py`) → static JSON
- Vite + React + TypeScript
- Canvas 2D renderer (`src/mapRenderer.ts`)
- No backend. No env vars.

## Setup

```bash
# UI (uses prebuilt JSON in public/data)
npm install
npm run dev          # http://127.0.0.1:5173
npm run build
npm run preview
```

Rebuild data from parquet (optional):

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# unzip the assignment player_data.zip into ./player_data
.venv/bin/python scripts/etl.py
```

## Repo layout

```
scripts/etl.py          parquet → JSON
data/schema.json        frozen JSON contract
public/data/            index, matches, heat
public/minimaps/        1024² JPEGs
src/                    React app
ARCHITECTURE.md         for designers and engineers
INSIGHTS.md             three findings from the tool
docs/walkthrough.mp4    60-second screen recording
```

`player_data/` parquet is not in git (large, already provided in the assignment zip). The app runs from `public/data`.

## Coordinate mapping

World `(x, z)` → minimap, Y-flip. Formula and map origins: `ARCHITECTURE.md`. `y` is elevation and is ignored. Pixel coords are baked in the JSON.

## Assumptions (short)

- Parquet `ts` is typed as timestamp[ms] but raw ints are Unix **seconds**.
- Calendar date = UTC date of match `t0`, not the `February_*` folder.
- Deduped `(user_id, match_id)` across days.
- No extract event in the schema.
- 2026-02-14 is a partial day.
