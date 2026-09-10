import type { HeatFile, IndexFile, MapId, Match } from "./types";

export async function loadIndex(): Promise<IndexFile> {
  const res = await fetch("/data/index.json");
  if (!res.ok) throw new Error(`Failed to load index (${res.status})`);
  return res.json();
}

export async function loadMatch(file: string): Promise<Match> {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`Failed to load match (${res.status})`);
  return res.json();
}

export async function loadHeat(mapId: MapId, date: string): Promise<HeatFile> {
  const res = await fetch(`/data/heat/${mapId}_${date}.json`);
  if (!res.ok) throw new Error(`Failed to load heat (${res.status})`);
  return res.json();
}
