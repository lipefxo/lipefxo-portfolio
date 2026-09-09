"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { createTerrainScene } from "./terrainScene";
import type { VillageLayout } from "./villageModel";
import { lightingLevelForSun } from "./nightLighting";
import { DEFAULT_SOLAR_SETTINGS, getSolarPosition, type SolarSettings } from "./solarPosition";
import styles from "./terrain.module.css";

type Scene = ReturnType<typeof createTerrainScene>;
const layouts = {
  a: { name: "The Promenade", image: "/terrain/concepts/a-promenade-pool-solar.png" },
  c: { name: "The Garden Comb", image: "/terrain/concepts/c-garden-comb-pool-solar.png" },
};

const formatTime = (minutes: number | null) => {
  if (minutes === null) return "—";
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
};

export default function TerrainExplorer() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState("loading");
  const [view, setView] = useState<"perspective" | "top">("perspective");
  const [layout, setLayout] = useState<VillageLayout>("a");
  const [solar, setSolar] = useState<SolarSettings>(DEFAULT_SOLAR_SETTINGS);
  const [sunOpen, setSunOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const sunPosition = getSolarPosition(solar);
  useEffect(() => { scene.current?.setSun(solar); }, [solar]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setSolar(previous => ({ ...previous, timeMinutes: previous.timeMinutes >= 1195 ? 300 : previous.timeMinutes + 5 })), 180);
    return () => clearInterval(timer);
  }, [playing]);
  function changeSun(update: Partial<SolarSettings>) { setPlaying(false); setSolar(previous => ({ ...previous, ...update })); }


  useEffect(() => {
    let cancelled = false;
    import("./terrainScene").then(({ createTerrainScene }) => {
      if (cancelled || !host.current) return;
      scene.current = createTerrainScene(host.current);
      setStatus("ready");
    }).catch(error => { console.error("Terrain scene initialization failed", error); if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  function changeView(next: typeof view) { setView(next); scene.current?.setView(next); }
  function changeLayout(next: VillageLayout) { scene.current?.setLayout(next); setLayout(next); }

  return (
    <main className={styles.app}>
      <section className={styles.viewport} aria-label="Interactive terrain model">
        <div ref={host} className={styles.canvas} />
        <div className={styles.layoutControls}>
          <div className={styles.tabs} role="group" aria-label="Village layout">
            <button disabled={status !== "ready"} aria-pressed={layout === "a"} onClick={() => changeLayout("a")}>A · Promenade</button>
            <button disabled={status !== "ready"} aria-pressed={layout === "c"} onClick={() => changeLayout("c")}>C · Garden Comb</button>
          </div>
        </div>
        <div className={styles.viewControls}>
          <div className={styles.tabs} role="group" aria-label="Terrain view">
            <button disabled={status !== "ready"} aria-pressed={view === "perspective"} onClick={() => changeView("perspective")}>3D view</button>
            <button disabled={status !== "ready"} aria-pressed={view === "top"} onClick={() => changeView("top")}>Plan view</button>
            <button disabled={status !== "ready"} onClick={() => scene.current?.reset()} aria-label="Fit site">↺</button>
          </div>
        </div>
        <div className={styles.sunControls}>
          <button className={styles.sunToggle} aria-expanded={sunOpen} onClick={() => setSunOpen(!sunOpen)}>☀ {formatTime(solar.timeMinutes)} · Sun & shadows</button>
          {sunOpen && <div className={styles.sunPanel}>
            <div className={styles.sunHeader}><strong>Sun study</strong><span>Brasília · UTC−3</span></div>
            <label className={styles.dateLabel}>Date<input type="date" min="1900-01-01" max="2100-12-31" value={solar.date} onChange={event => { if (event.target.value) changeSun({ date: event.target.value }); }} /></label>
            <div className={styles.timeReadout}><output>{formatTime(solar.timeMinutes)}</output><span>{sunPosition.elevation < 0 ? "Below horizon" : `${sunPosition.elevation.toFixed(1)}° altitude`}</span></div>
            <input aria-label="Time of day" type="range" min="0" max="1439" step="1" value={solar.timeMinutes} disabled={status !== "ready"} onChange={event => changeSun({ timeMinutes: Number(event.target.value) })} />
            <div className={styles.sunPresets}>
              <button onClick={() => changeSun({ timeMinutes: Math.round(sunPosition.sunriseMinutes ?? 360) })}>Sunrise</button>
              <button onClick={() => changeSun({ timeMinutes: 720 })}>Noon</button>
              <button onClick={() => changeSun({ timeMinutes: Math.round(sunPosition.sunsetMinutes ?? 1080) })}>Sunset</button>
              <button aria-pressed={playing} disabled={status !== "ready"} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play day"}</button>
            </div>
            <p className={styles.sunTimes} aria-live="polite">Site lights · {lightingLevelForSun(sunPosition.elevation) === 0 ? "Off in daylight" : lightingLevelForSun(sunPosition.elevation) === 1 ? "On automatically" : "Twilight dimming"}</p>
            <p className={styles.sunTimes}>Rise {formatTime(sunPosition.sunriseMinutes)} · Set {formatTime(sunPosition.sunsetMinutes)} · Azimuth {sunPosition.azimuth.toFixed(0)}°</p>
            <details><summary>Site orientation</summary><label>North rotation · {solar.northRotationDeg}°<input aria-label="North rotation" type="range" min="0" max="359" value={solar.northRotationDeg} onChange={event => changeSun({ northRotationDeg: Number(event.target.value) })} /></label><p>North inferred from the survey grid; adjust to correct alignment. Flat ground, no surrounding terrain obstructions.</p></details>
          </div>}
        </div>
        <div className={styles.caption}>
          <span className={styles.kicker}>LOT 75 · CONCEPT {layout.toUpperCase()}</span>
          <h1>{layouts[layout].name}</h1>
          <p>4 homes · 102 m² each · social pavilion + pool</p>
          <button onClick={() => dialog.current?.showModal()}>View concept image ↗</button>
        </div>
        <div className={styles.hint}>Drag to orbit · Scroll to zoom · Right-drag to pan<span>Approximate site geometry · Flat elevation assumed</span></div>
        {status !== "ready" && <div role="status" className={styles.message}>{status === "loading" ? "Planting the village…" : "The 3D canvas couldn’t start. Try a browser with WebGL enabled."}</div>}
        <dialog ref={dialog} className={styles.dialog} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
          <header><span>{layouts[layout].name} · Image Gen concept</span><button onClick={() => dialog.current?.close()}>Close ×</button></header>
          <Image src={layouts[layout].image} width={1536} height={1024} alt={`${layouts[layout].name}: four elongated homes with rooftop solar, ipê trees, paved connections and a shared social pavilion with a small pool.`} />
        </dialog>
      </section>
    </main>
  );
}
