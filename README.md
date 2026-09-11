# LILA BLACK — Player Journey tool

This repo is based on **our understanding of the assignment**: ship a hosted tool so a Level Designer can **see** how players move, fight, loot, and die on LILA BLACK maps — then prove we learned something about the game from the tool itself.

That reading is enough for a first useful loop (filter a map → read heat → play one match). To develop the tool further we would need **consistent communication with the level design team**. Their map intent and playtests are the missing half of the product. The files show where people walked; designers know whether that is a problem, which overlays they trust, and what “done” looks like for a map pass.

How we used Cursor and Figma to get here: [PROCESS.md](PROCESS.md).

**Live:** https://lila-player-journey-sage.vercel.app  
**Repo:** https://github.com/iamdeepakram/lila-player-journey

## 60-second walkthrough

The recording plays below (Ambrose Valley heat and playback, then Lockdown and Grand Rift).

![60-second walkthrough of the player-journey tool](docs/walkthrough.gif)

Original file: [docs/walkthrough.mp4](docs/walkthrough.mp4)

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
PROCESS.md              Cursor + Figma/FigJam from brief to ship
docs/walkthrough.gif    60s recording (plays in this README)
docs/walkthrough.mp4    original screen recording
docs/figjam/            screenshots of the four understanding boards
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
