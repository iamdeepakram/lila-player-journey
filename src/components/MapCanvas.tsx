import { useEffect, useRef } from "react";
import { createCanvasRenderer, type MapRenderer } from "../mapRenderer";
import type { HeatFile, LayerState, Match } from "../types";

type Props = {
  match: Match | null;
  heat: HeatFile | null;
  layers: LayerState;
  time: number | null;
  imageSrc: string;
};

export function MapCanvas({ match, heat, layers, time, imageSrc }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createCanvasRenderer(canvas);
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const fit = () => {
      const size = Math.floor(
        Math.min(canvas.parentElement?.clientWidth ?? 1024, 720),
      );
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      renderer.draw();
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [match, layers, heat, time, imageSrc]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setMatch(match);
    renderer.setHeat(heat);
    renderer.setTime(time);
    renderer.setLayers(layers);
    renderer.draw();
  }, [match, heat, layers, time]);

  return (
    <div className="map-stage">
      <img key={imageSrc} src={imageSrc} alt="Minimap" className="minimap" />
      <canvas ref={canvasRef} className="overlay" />
    </div>
  );
}
