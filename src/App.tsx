import { useEffect, useMemo, useState } from "react";
import { loadHeat, loadIndex, loadMatch } from "./api";
import { Filters } from "./components/Filters";
import { Legend } from "./components/Legend";
import { MapCanvas } from "./components/MapCanvas";
import { PlaybackBar } from "./components/PlaybackBar";
import {
  DEFAULT_LAYERS,
  DEFAULT_MATCH_ID,
  type HeatFile,
  type IndexFile,
  type LayerState,
  type MapId,
  type Match,
} from "./types";

export function App() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapId, setMapId] = useState<MapId>("AmbroseValley");
  const [date, setDate] = useState("2026-02-10");
  const [matchId, setMatchId] = useState(DEFAULT_MATCH_ID);
  const [match, setMatch] = useState<Match | null>(null);
  const [heat, setHeat] = useState<HeatFile | null>(null);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e: Error) => setError(e.message));
  }, []);

  const maps = useMemo(
    () => (index ? (Object.keys(index.maps) as MapId[]) : []),
    [index],
  );

  const dates = useMemo(() => {
    if (!index) return [];
    return Array.from(
      new Set(
        index.matches.filter((m) => m.map_id === mapId).map((m) => m.date),
      ),
    ).sort();
  }, [index, mapId]);

  const filtered = useMemo(() => {
    if (!index) return [];
    return index.matches.filter((m) => m.map_id === mapId && m.date === date);
  }, [index, mapId, date]);

  useEffect(() => {
    if (!dates.length) return;
    if (!dates.includes(date)) setDate(dates[0]);
  }, [dates, date]);

  useEffect(() => {
    if (!filtered.length) return;
    if (!filtered.some((m) => m.match_id === matchId)) {
      const preferred = filtered.find((m) => m.match_id === DEFAULT_MATCH_ID);
      setMatchId((preferred ?? filtered[0]).match_id);
    }
  }, [filtered, matchId]);

  useEffect(() => {
    const row = filtered.find((m) => m.match_id === matchId);
    if (!row) {
      setMatch(null);
      return;
    }
    let cancelled = false;
    setMatch(null);
    setPlaying(false);
    loadMatch(row.file)
      .then((m) => {
        if (cancelled) return;
        setMatch(m);
        setTime(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filtered, matchId]);

  useEffect(() => {
    let cancelled = false;
    loadHeat(mapId, date)
      .then((h) => {
        if (!cancelled) setHeat(h);
      })
      .catch(() => {
        if (!cancelled) setHeat(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mapId, date]);

  useEffect(() => {
    if (!playing || !match) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      setTime((t) => {
        const current = t ?? 0;
        const next = current + dt;
        if (next >= match.duration_s) {
          setPlaying(false);
          return match.duration_s;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, match, speed]);

  if (error) return <main className="page error">Could not load data: {error}</main>;
  if (!index) return <main className="page">Loading match index…</main>;

  const row = filtered.find((m) => m.match_id === matchId);
  const image = `/minimaps/${index.maps[mapId].image}`;
  const duration = match?.duration_s ?? row?.duration_s ?? 0;

  function togglePlay() {
    if (!match) return;
    const atEnd = time === null || time >= match.duration_s;
    if (!playing && atEnd) setTime(0);
    setPlaying((p) => !p);
  }

  const displayTime = time ?? duration;

  return (
    <main className="page">
      <header>
        <div>
          <h1>LILA BLACK — Player journeys</h1>
          <p className="sub">
            Orient on the heatmap, then play a match to verify.
          </p>
        </div>
        {row && (
          <p className="meta">
            {row.map_id} · {row.date}
            {row.partial_day ? " (partial day)" : ""} · {row.duration_s}s ·{" "}
            {row.human_count} human / {row.bot_count} bot · {row.kill_count}{" "}
            kills · {row.loot_count} loot
          </p>
        )}
      </header>
      <Filters
        maps={maps}
        dates={dates}
        matches={filtered}
        mapId={mapId}
        date={date}
        matchId={matchId}
        onMap={setMapId}
        onDate={setDate}
        onMatch={setMatchId}
      />
      <div className="workspace">
        <div className="map-col">
          <MapCanvas
            match={match}
            heat={heat}
            layers={layers}
            time={time}
            imageSrc={image}
          />
          <PlaybackBar
            duration={duration}
            time={displayTime}
            playing={playing}
            speed={speed}
            onToggle={togglePlay}
            onSeek={(t) => {
              setPlaying(false);
              setTime(t);
            }}
            onSpeed={setSpeed}
          />
        </div>
        <Legend layers={layers} onChange={setLayers} />
      </div>
    </main>
  );
}
