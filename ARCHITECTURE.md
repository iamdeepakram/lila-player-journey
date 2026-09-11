# Architecture — LILA Player Journey

This note is for two readers.

- **If you design maps or products:** read *What this is* and *How someone uses it*. A [60-second recording](docs/walkthrough.mp4) shows the same loop.
- **If you review the code:** keep going through *How it is built* and *Decisions*.

---

## What this is

Level designers had match recordings and map pictures, but no easy way to **see** them together. Opening parquet files in Python and guessing coordinates is how people give up.

This tool is a webpage. You pick a map, a day, and a match. Player paths and fights draw on the official minimap. You can play the match like a tape, or look at heat for the whole day.

It answers questions like: where do people actually walk? where do they fight? where do they die to the storm? which parts of the map are empty?

It does **not** try to be a data-science notebook. The user is a designer, not a SQL person.

---

## How someone uses it

Three steps, on purpose:

1. **Orient** — land on Ambrose Valley, see the traffic heat. The empty east side is obvious.
2. **Suspect** — “this corner is a death trap” or “nobody goes right.”
3. **Verify** — open one match, hit Play, watch it happen.

Humans are bright cyan. Bots are quieter orange. Loot, kills, deaths, and storm deaths are separate marks you can turn off.

We never dump all 796 matches on one canvas. That would be brown sludge. Default is **one map, one date, one match**.

---

## How it is built

Think of two rooms.

**Kitchen (once, on a laptop):** a Python script reads the raw match files and writes small JSON files plus map images. That is `scripts/etl.py`.

**Dining room (the website):** the browser only loads those JSON files and draws on a canvas over the minimap. No Python runs in production. Vercel just hosts a folder.

```
raw match files (parquet)
        ↓  Python, once
JSON + minimap pictures
        ↓  any browser
what the designer sees
```

| Piece | Choice | In plain language |
|---|---|---|
| Data prep | Python ETL | Cook the data before guests arrive |
| Website | Vite + React | Buttons, filters, layout |
| Drawing | HTML Canvas 2D | Paths and heat on top of the map picture |
| Hosting | Vercel (static) | A link. No server to babysit |

The drawing code lives in `src/mapRenderer.ts`. React never paints pixels itself. If we later need WebGL (PixiJS) for thousands of paths, we replace that one file. Filters and JSON stay.

### Turning game space into map pixels

The game stores 3D positions. The minimap is a 2D picture (1024×1024). Height (`y`) is ignored. We use `x` and `z`, shift by the map origin, divide by scale, then **flip Y** because images start at the top-left.

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u × 1024
pixel_y = (1 - v) × 1024
```

| Map | scale | origin |
|---|---|---|
| Ambrose Valley | 900 | (-370, -473) |
| Grand Rift | 581 | (-290, -290) |
| Lockdown | 1000 | (-500, -500) |

The script stores `pixel_x` / `pixel_y` in JSON so the website cannot “almost” get this formula wrong. We checked by drawing a known match: the line sits on terrain, not mirrored into the void.

### Time

The files *say* timestamps in milliseconds. If you trust that, a match lasts 0.4 seconds and the clock reads 1970. The raw numbers are actually **Unix seconds** in February 2026. We treat duration as `last - first` of those integers. The date on the filter is that instant in UTC, not the folder name `February_10` — some matches were copied into two folders.

### Who is a human

A UUID is a human. A short number (`1440`) is a bot. Combat with bots is often stored on the **human’s** file (`BotKill` / `BotKilled`), even when the README only mentions `BotPosition` for bots.

---

## Decisions (why not the obvious alternatives)

| Idea | We did | Why |
|---|---|---|
| Streamlit / Plotly | No | Fine for analysts. Bad for “press Play and watch a match.” Also needs a live Python process. |
| Draw every match at once | No | Unreadable. Designers drill in. |
| Parse parquet in the browser | No | 1,243 files, easy to break the first load. JSON is the product API. |
| Spark / a warehouse | No | ~8MB of events. A warehouse is a costume. |
| PixiJS / a map engine now | No | Right for thousands of sprites or GIS. Wrong for eight bots on a picture. |
| Vue or Svelte instead of React | No | Same architecture. React is what most reviewers have seen. |

**If this tool grew** into live ops: keep the JSON shape, run the kitchen script on a schedule, add an API only when the match list is too big, swap Canvas for Pixi if frames drop. Do not rebuild the product to change the renderer.

---

## Assumptions we documented rather than blocking on

- Same player can appear in two day folders → we keep one `(user_id, match_id)`.
- There is **no extract event**, so “loot on the way to extract” cannot be proven, only guessed.
- 14 Feb is a partial day. Do not treat it as a full trend.
- `Kill` and `Killed` are two people, two files, two positions (shooter vs victim).

Schema: `data/schema.json`. Insights we actually saw in the tool: `INSIGHTS.md`.
