import type { MapId, MatchIndexRow } from "../types";

type Props = {
  maps: MapId[];
  dates: string[];
  matches: MatchIndexRow[];
  mapId: MapId;
  date: string;
  matchId: string;
  onMap: (id: MapId) => void;
  onDate: (date: string) => void;
  onMatch: (id: string) => void;
};

export function Filters({
  maps,
  dates,
  matches,
  mapId,
  date,
  matchId,
  onMap,
  onDate,
  onMatch,
}: Props) {
  return (
    <div className="filters">
      <label>
        Map
        <select value={mapId} onChange={(e) => onMap(e.target.value as MapId)}>
          {maps.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <select value={date} onChange={(e) => onDate(e.target.value)}>
          {dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="match-select">
        Match
        <select value={matchId} onChange={(e) => onMatch(e.target.value)}>
          {matches.map((m) => (
            <option key={m.match_id} value={m.match_id}>
              {m.human_count}H / {m.bot_count}B · {m.duration_s}s ·{" "}
              {m.kill_count} kills
              {m.partial_day ? " · partial" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
