import type { HeatFile, HeatLayerName, LayerState, Match } from "./types";

/** Swappable map backend. PixiJS can implement this later without touching React. */
export type MapRenderer = {
  setMatch: (match: Match | null) => void;
  /** Seconds from match t0. null = draw the full journey. */
  setTime: (t: number | null) => void;
  setLayers: (layers: LayerState) => void;
  setHeat: (heat: HeatFile | null) => void;
  draw: () => void;
  destroy: () => void;
};

const HUMAN = "#4cc9f0";
const BOT = "rgba(244, 162, 97, 0.55)";
const HEAT_RGB: Record<HeatLayerName, string> = {
  traffic: "76, 201, 240",
  kills: "230, 57, 57",
  deaths_pvp: "214, 40, 40",
  deaths_storm: "157, 78, 221",
};

const EVENT_STYLE: Record<
  string,
  { fill: string; shape: "circle" | "x" | "square" | "plus" }
> = {
  Kill: { fill: "#e63939", shape: "circle" },
  Killed: { fill: "#9b2226", shape: "x" },
  BotKill: { fill: "#f4a261", shape: "circle" },
  BotKilled: { fill: "#d62828", shape: "x" },
  Loot: { fill: "#ffd60a", shape: "square" },
  KilledByStorm: { fill: "#9d4edd", shape: "plus" },
};

export function createCanvasRenderer(canvas: HTMLCanvasElement): MapRenderer {
  const maybe = canvas.getContext("2d");
  if (!maybe) throw new Error("Canvas 2D unavailable");
  const ctx = maybe;

  let match: Match | null = null;
  let heat: HeatFile | null = null;
  let time: number | null = null;
  let layers: LayerState = {
    humans: true,
    bots: true,
    events: {
      Kill: true,
      Killed: true,
      BotKill: true,
      BotKilled: true,
      Loot: true,
      KilledByStorm: true,
    },
    heat: {
      traffic: true,
      kills: false,
      deaths_pvp: false,
      deaths_storm: false,
    },
  };
  let destroyed = false;

  function visiblePath(tMax: number | null, t: number) {
    return tMax === null || t <= tMax;
  }

  function drawHeat() {
    if (!heat) return;
    const cell = 1024 / heat.grid;
    const order: HeatLayerName[] = [
      "traffic",
      "kills",
      "deaths_pvp",
      "deaths_storm",
    ];
    for (const name of order) {
      if (!layers.heat[name]) continue;
      const cells = heat.layers[name] ?? [];
      if (!cells.length) continue;
      const max = Math.max(...cells.map((c) => c.n), 1);
      const rgb = HEAT_RGB[name];
      for (const c of cells) {
        const a = 0.1 + 0.42 * (Math.log(c.n + 1) / Math.log(max + 1));
        ctx.fillStyle = `rgba(${rgb}, ${a})`;
        ctx.fillRect(c.ix * cell, c.iy * cell, cell, cell);
      }
    }
  }

  function marker(px: number, py: number, type: string) {
    const style = EVENT_STYLE[type];
    if (!style) return;
    const { fill, shape } = style;
    const s = 6;
    ctx.strokeStyle = "#0b0d10";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = fill;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape === "square") {
      ctx.beginPath();
      ctx.rect(px - s, py - s, s * 2, s * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shape === "x") {
      ctx.beginPath();
      ctx.moveTo(px - s, py - s);
      ctx.lineTo(px + s, py + s);
      ctx.moveTo(px + s, py - s);
      ctx.lineTo(px - s, py + s);
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(px - s, py);
      ctx.lineTo(px + s, py);
      ctx.moveTo(px, py - s);
      ctx.lineTo(px, py + s);
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }

  const renderer: MapRenderer = {
    setMatch(next) {
      match = next;
    },
    setTime(t) {
      time = t;
    },
    setLayers(next) {
      layers = next;
    },
    setHeat(next) {
      heat = next;
    },
    draw() {
      if (destroyed) return;
      const { width } = canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(width / 1024, width / 1024);
      drawHeat();
      if (match) {
        const tMax = time;
        if (layers.bots) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = BOT;
          for (const actor of match.actors) {
            if (actor.is_human || actor.path.length < 2) continue;
            ctx.beginPath();
            let started = false;
            for (const p of actor.path) {
              if (!visiblePath(tMax, p.t)) continue;
              if (!started) {
                ctx.moveTo(p.px, p.py);
                started = true;
              } else ctx.lineTo(p.px, p.py);
            }
            ctx.stroke();
          }
        }
        if (layers.humans) {
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = HUMAN;
          for (const actor of match.actors) {
            if (!actor.is_human || actor.path.length < 2) continue;
            ctx.beginPath();
            let started = false;
            for (const p of actor.path) {
              if (!visiblePath(tMax, p.t)) continue;
              if (!started) {
                ctx.moveTo(p.px, p.py);
                started = true;
              } else ctx.lineTo(p.px, p.py);
            }
            ctx.stroke();
            const pts = actor.path.filter((p) => visiblePath(tMax, p.t));
            if (pts.length) {
              const a = pts[0];
              const b = pts[pts.length - 1];
              ctx.fillStyle = "#8cff8c";
              ctx.beginPath();
              ctx.arc(a.px, a.py, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#ff4d4d";
              ctx.beginPath();
              ctx.arc(b.px, b.py, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        for (const ev of match.events) {
          if (!layers.events[ev.type]) continue;
          if (!visiblePath(tMax, ev.t)) continue;
          marker(ev.px, ev.py, ev.type);
        }
      }
      ctx.restore();
    },
    destroy() {
      destroyed = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };

  return renderer;
}
