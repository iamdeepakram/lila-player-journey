export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export type EventType =
  | "Kill"
  | "Killed"
  | "BotKill"
  | "BotKilled"
  | "Loot"
  | "KilledByStorm";

export type MapConfig = {
  scale: number;
  origin_x: number;
  origin_z: number;
  size: number;
  image: string;
};

export type MatchIndexRow = {
  match_id: string;
  file: string;
  map_id: MapId;
  date: string;
  duration_s: number;
  human_count: number;
  bot_count: number;
  kill_count: number;
  death_count: number;
  loot_count: number;
  storm_deaths: number;
  partial_day: boolean;
};

export type IndexFile = {
  maps: Record<MapId, MapConfig>;
  matches: MatchIndexRow[];
};

export type PathPoint = {
  t: number;
  x: number;
  z: number;
  px: number;
  py: number;
};

export type Actor = {
  user_id: string;
  is_human: boolean;
  path: PathPoint[];
};

export type MatchEvent = {
  t: number;
  user_id: string;
  is_human: boolean;
  type: EventType;
  x: number;
  z: number;
  px: number;
  py: number;
};

export type Match = {
  match_id: string;
  map_id: MapId;
  date: string;
  t0: number;
  duration_s: number;
  actors: Actor[];
  events: MatchEvent[];
};

export type HeatLayerName = "traffic" | "kills" | "deaths_pvp" | "deaths_storm";

export type LayerState = {
  humans: boolean;
  bots: boolean;
  events: Record<EventType, boolean>;
  heat: Record<HeatLayerName, boolean>;
};

export type HeatCell = { ix: number; iy: number; n: number };

export type HeatFile = {
  map_id: MapId;
  date: string | null;
  grid: number;
  layers: Record<HeatLayerName, HeatCell[]>;
};

export const DEFAULT_LAYERS: LayerState = {
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

export const DEFAULT_MATCH_ID =
  "ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0";
