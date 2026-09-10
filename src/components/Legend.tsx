import type { EventType, HeatLayerName, LayerState } from "../types";

const EVENT_LABELS: { type: EventType; label: string; swatch: string }[] = [
  { type: "Kill", label: "Kill (human)", swatch: "#e63939" },
  { type: "Killed", label: "Died to human", swatch: "#9b2226" },
  { type: "BotKill", label: "Killed a bot", swatch: "#f4a261" },
  { type: "BotKilled", label: "Died to bot", swatch: "#d62828" },
  { type: "Loot", label: "Loot", swatch: "#ffd60a" },
  { type: "KilledByStorm", label: "Storm death", swatch: "#9d4edd" },
];

const HEAT_LABELS: { type: HeatLayerName; label: string; swatch: string }[] = [
  { type: "traffic", label: "Traffic heat (this date)", swatch: "#4cc9f0" },
  { type: "kills", label: "Kill zones", swatch: "#e63939" },
  { type: "deaths_pvp", label: "PvP death zones", swatch: "#d62828" },
  { type: "deaths_storm", label: "Storm death zones", swatch: "#9d4edd" },
];

type Props = {
  layers: LayerState;
  onChange: (next: LayerState) => void;
};

export function Legend({ layers, onChange }: Props) {
  return (
    <div className="legend">
      <p className="legend-title">This match</p>
      <label>
        <input
          type="checkbox"
          checked={layers.humans}
          onChange={(e) => onChange({ ...layers, humans: e.target.checked })}
        />
        <span className="swatch human" /> Human path
      </label>
      <label>
        <input
          type="checkbox"
          checked={layers.bots}
          onChange={(e) => onChange({ ...layers, bots: e.target.checked })}
        />
        <span className="swatch bot" /> Bot path
      </label>
      {EVENT_LABELS.map((row) => (
        <label key={row.type}>
          <input
            type="checkbox"
            checked={layers.events[row.type]}
            onChange={(e) =>
              onChange({
                ...layers,
                events: { ...layers.events, [row.type]: e.target.checked },
              })
            }
          />
          <span className="swatch" style={{ background: row.swatch }} />
          {row.label}
        </label>
      ))}
      <p className="legend-title heat-title">Map / date heat</p>
      {HEAT_LABELS.map((row) => (
        <label key={row.type}>
          <input
            type="checkbox"
            checked={layers.heat[row.type]}
            onChange={(e) =>
              onChange({
                ...layers,
                heat: { ...layers.heat, [row.type]: e.target.checked },
              })
            }
          />
          <span className="swatch" style={{ background: row.swatch }} />
          {row.label}
        </label>
      ))}
    </div>
  );
}
