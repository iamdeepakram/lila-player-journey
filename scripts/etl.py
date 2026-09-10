#!/usr/bin/env python3
"""Parquet → JSON ETL. Browser never reads parquet."""

from __future__ import annotations

import json
import math
import shutil
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
PLAYER_DATA = ROOT / "player_data"
OUT = ROOT / "public" / "data"
MATCH_DIR = OUT / "matches"
HEAT_DIR = OUT / "heat"
PUBLIC_MAPS = ROOT / "public" / "minimaps"

MAPS = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473, "size": 1024,
                      "image": "AmbroseValley_Minimap.jpg"},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290, "size": 1024,
                  "image": "GrandRift_Minimap.jpg"},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500, "size": 1024,
                 "image": "Lockdown_Minimap.jpg"},
}

GRID = 64
MAX_PATH_POINTS = 400
POSITION_EVENTS = {"Position", "BotPosition"}
KILL_EVENTS = {"Kill", "BotKill"}
DEATH_PVP_EVENTS = {"Killed", "BotKilled"}
STORM_EVENTS = {"KilledByStorm"}
STORY_EVENTS = KILL_EVENTS | DEATH_PVP_EVENTS | STORM_EVENTS | {"Loot"}
PARTIAL_DAY = "2026-02-14"


def is_human(user_id: str) -> bool:
    return (not user_id.isdigit()) and ("-" in user_id)


def world_to_pixel(x: float, z: float, map_id: str) -> tuple[float, float]:
    cfg = MAPS[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    return u * cfg["size"], (1 - v) * cfg["size"]


def decode_event(value) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, dict) and "bytes" in value:
        return bytes(value["bytes"]).decode("utf-8")
    return str(value)


def load_file(path: Path) -> dict | None:
    try:
        table = pq.read_table(path)
    except Exception:
        return None
    if table.num_rows == 0:
        return None
    pdf = table.to_pandas()
    pdf["event"] = pdf["event"].map(decode_event)
    pdf["ts_raw"] = table.column("ts").cast("int64").to_pandas().to_numpy()
    user_id = str(pdf["user_id"].iloc[0])
    match_id = str(pdf["match_id"].iloc[0])
    map_id = str(pdf["map_id"].iloc[0])
    rows = []
    seen = set()
    for rec in pdf.itertuples(index=False):
        key = (int(rec.ts_raw), rec.event, float(rec.x), float(rec.z))
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "user_id": str(rec.user_id),
                "match_id": str(rec.match_id),
                "map_id": str(rec.map_id),
                "x": float(rec.x),
                "z": float(rec.z),
                "ts_raw": int(rec.ts_raw),
                "event": rec.event,
            }
        )
    return {
        "user_id": user_id,
        "match_id": match_id,
        "map_id": map_id,
        "n": len(rows),
        "rows": rows,
        "path": path,
    }


def downsample_path(points: list[dict]) -> list[dict]:
    if len(points) <= MAX_PATH_POINTS:
        return points
    step = math.ceil(len(points) / MAX_PATH_POINTS)
    kept = points[::step]
    if points[-1] is not kept[-1]:
        kept.append(points[-1])
    return kept


def bin_cell(px: float, py: float) -> tuple[int, int] | None:
    ix = int(px / 1024 * GRID)
    iy = int(py / 1024 * GRID)
    if 0 <= ix < GRID and 0 <= iy < GRID:
        return ix, iy
    return None


def sparse(counter: dict[tuple[int, int], int]) -> list[dict]:
    return [{"ix": k[0], "iy": k[1], "n": n} for k, n in sorted(counter.items()) if n > 0]


def main() -> None:
    files = []
    for day in sorted(PLAYER_DATA.glob("February_*")):
        for f in day.iterdir():
            if f.name.startswith("."):
                continue
            files.append(f)

    skipped = 0
    best: dict[tuple[str, str], dict] = {}
    for path in files:
        actor = load_file(path)
        if actor is None:
            skipped += 1
            continue
        key = (actor["user_id"], actor["match_id"])
        prev = best.get(key)
        if prev is None or actor["n"] > prev["n"]:
            best[key] = actor

    matches: dict[str, list[dict]] = defaultdict(list)
    for actor in best.values():
        matches[actor["match_id"]].append(actor)

    MATCH_DIR.mkdir(parents=True, exist_ok=True)
    HEAT_DIR.mkdir(parents=True, exist_ok=True)

    heat_all = {
        m: {k: defaultdict(int) for k in ("traffic", "kills", "deaths_pvp", "deaths_storm")}
        for m in MAPS
    }
    heat_date: dict[tuple[str, str], dict] = defaultdict(
        lambda: {k: defaultdict(int) for k in ("traffic", "kills", "deaths_pvp", "deaths_storm")}
    )

    index = []
    for match_id, actors in matches.items():
        all_rows = []
        for a in actors:
            all_rows.extend(a["rows"])
        if not all_rows:
            continue
        map_id = max(
            (a["map_id"] for a in actors),
            key=lambda m: sum(1 for r in all_rows if r["map_id"] == m),
        )
        if map_id not in MAPS:
            continue
        t0 = min(r["ts_raw"] for r in all_rows)
        t1 = max(r["ts_raw"] for r in all_rows)
        duration_s = int(t1 - t0)
        date = datetime.fromtimestamp(t0, tz=timezone.utc).date().isoformat()

        out_actors = []
        out_events = []
        for a in actors:
            human = is_human(a["user_id"])
            path_pts = []
            for r in sorted(a["rows"], key=lambda x: x["ts_raw"]):
                t = int(r["ts_raw"] - t0)
                px, py = world_to_pixel(r["x"], r["z"], map_id)
                if r["event"] in POSITION_EVENTS:
                    path_pts.append({"t": t, "x": round(r["x"], 2), "z": round(r["z"], 2),
                                     "px": round(px, 1), "py": round(py, 1)})
                    if human:
                        cell = bin_cell(px, py)
                        if cell:
                            heat_all[map_id]["traffic"][cell] += 1
                            heat_date[(map_id, date)]["traffic"][cell] += 1
                if r["event"] in STORY_EVENTS:
                    ev = {
                        "t": t,
                        "user_id": a["user_id"],
                        "is_human": human,
                        "type": r["event"],
                        "x": round(r["x"], 2),
                        "z": round(r["z"], 2),
                        "px": round(px, 1),
                        "py": round(py, 1),
                    }
                    out_events.append(ev)
                    cell = bin_cell(px, py)
                    if cell:
                        if r["event"] in KILL_EVENTS:
                            heat_all[map_id]["kills"][cell] += 1
                            heat_date[(map_id, date)]["kills"][cell] += 1
                        elif r["event"] in DEATH_PVP_EVENTS:
                            heat_all[map_id]["deaths_pvp"][cell] += 1
                            heat_date[(map_id, date)]["deaths_pvp"][cell] += 1
                        elif r["event"] in STORM_EVENTS:
                            heat_all[map_id]["deaths_storm"][cell] += 1
                            heat_date[(map_id, date)]["deaths_storm"][cell] += 1
            out_actors.append({
                "user_id": a["user_id"],
                "is_human": human,
                "path": downsample_path(path_pts),
            })

        out_events.sort(key=lambda e: (e["t"], e["type"]))
        human_count = sum(1 for a in out_actors if a["is_human"])
        bot_count = len(out_actors) - human_count
        kill_count = sum(1 for e in out_events if e["type"] in KILL_EVENTS)
        death_count = sum(1 for e in out_events if e["type"] in DEATH_PVP_EVENTS | STORM_EVENTS)
        loot_count = sum(1 for e in out_events if e["type"] == "Loot")
        storm_deaths = sum(1 for e in out_events if e["type"] == "KilledByStorm")

        match_payload = {
            "match_id": match_id,
            "map_id": map_id,
            "date": date,
            "t0": t0,
            "duration_s": duration_s,
            "actors": out_actors,
            "events": out_events,
        }
        safe = match_id.replace("/", "_")
        (MATCH_DIR / f"{safe}.json").write_text(json.dumps(match_payload, separators=(",", ":")))

        index.append({
            "match_id": match_id,
            "file": f"matches/{safe}.json",
            "map_id": map_id,
            "date": date,
            "duration_s": duration_s,
            "human_count": human_count,
            "bot_count": bot_count,
            "kill_count": kill_count,
            "death_count": death_count,
            "loot_count": loot_count,
            "storm_deaths": storm_deaths,
            "partial_day": date == PARTIAL_DAY,
        })

    index.sort(key=lambda m: (m["date"], m["map_id"], -m["human_count"], m["match_id"]))

    def dump_heat(layers: dict) -> dict:
        return {name: sparse(counter) for name, counter in layers.items()}

    heat_index = {"grid": GRID, "maps": {}}
    for map_id, layers in heat_all.items():
        payload = {"map_id": map_id, "date": None, "grid": GRID, "layers": dump_heat(layers)}
        fname = f"{map_id}.json"
        (HEAT_DIR / fname).write_text(json.dumps(payload, separators=(",", ":")))
        heat_index["maps"].setdefault(map_id, {})["all"] = f"heat/{fname}"
    for (map_id, date), layers in sorted(heat_date.items()):
        payload = {"map_id": map_id, "date": date, "grid": GRID, "layers": dump_heat(layers)}
        fname = f"{map_id}_{date}.json"
        (HEAT_DIR / fname).write_text(json.dumps(payload, separators=(",", ":")))
        heat_index["maps"].setdefault(map_id, {})[date] = f"heat/{fname}"

    PUBLIC_MAPS.mkdir(parents=True, exist_ok=True)
    src_maps = PLAYER_DATA / "minimaps"
    for img in src_maps.iterdir():
        if img.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            dest = PUBLIC_MAPS / (img.stem + ".jpg")
            try:
                from PIL import Image
                im = Image.open(img).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
                im.save(dest, "JPEG", quality=82, optimize=True)
            except Exception:
                shutil.copy2(img, PUBLIC_MAPS / img.name)

    summary = {
        "maps": MAPS,
        "assumptions": json.loads((ROOT / "data" / "schema.json").read_text())["assumptions"],
        "stats": {
            "source_files": len(files),
            "unreadable_or_empty": skipped,
            "unique_actors": len(best),
            "deduped_away": len(files) - skipped - len(best),
            "matches": len(index),
            "humans": sum(m["human_count"] for m in index),
            "bots": sum(m["bot_count"] for m in index),
        },
        "heat": heat_index,
        "matches": index,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.json").write_text(json.dumps(summary, indent=2))

    print(json.dumps(summary["stats"], indent=2))
    print("wrote", OUT / "index.json")
    print("matches", MATCH_DIR)
    print("heat", HEAT_DIR)


if __name__ == "__main__":
    main()
