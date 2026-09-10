type Props = {
  duration: number;
  time: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onSpeed: (speed: number) => void;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function PlaybackBar({
  duration,
  time,
  playing,
  speed,
  onToggle,
  onSeek,
  onSpeed,
}: Props) {
  return (
    <div className="playback">
      <button type="button" onClick={onToggle}>
        {playing ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step={1}
        value={Math.min(time, duration)}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="clock">
        {fmt(time)} / {fmt(duration)}
      </span>
      <div className="speeds">
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            className={speed === s ? "active" : ""}
            onClick={() => onSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
