"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  MOUNTS,
  PRESETS,
  SOURCES,
  MODEL_NOTES,
  evaluate,
  type Config,
  type Fan,
} from "./model";
import s from "./airflow.module.css";
import FloatingPanel from "./FloatingPanel";
import ExperiencePanel from "./ExperiencePanel";
import { DEFAULT_EXPERIENCE, PART_INFO, type Experience, type HardwarePart } from "./experience";

const CaseScene = dynamic(() => import("./CaseScene"), {
  ssr: false,
  loading: () => <div className={s.loading}>Preparing the 3D workspace…</div>,
});
type View = "perspective" | "side" | "front" | "rear" | "top";
type Scenario = { id: string; name: string; config: Config };
const STORAGE_KEY = "b4-airflow-scenarios-v1";
const clone = (value: Config): Config => JSON.parse(JSON.stringify(value));

function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (n: number) => void;
  help?: string;
}) {
  return (
    <label className={s.dial}>
      <span className={s.dialHeading}>
        <span>{label}</span>
        <span className={s.numberWrap}>
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              if (
                e.target.value !== "" &&
                Number.isFinite(e.target.valueAsNumber)
              )
                onChange(Math.min(max, Math.max(min, e.target.valueAsNumber)));
            }}
          />
          <span>{unit}</span>
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {help ? <span className={s.help}>{help}</span> : null}
    </label>
  );
}
function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={s.toggle}>
      <span>{children}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={s.switch} aria-hidden="true" />
    </label>
  );
}
function FanIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 9C5 8 6 2 10 3c3 0 3 3 2 6M15 11c1-6 7-5 6-1 0 3-3 3-6 2M13 15c6 1 5 7 1 6-3 0-3-3-2-6M9 13c-1 6-7 5-6 1 0-3 3-3 6-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function validConfig(value: unknown): value is Config {
  if (!value || typeof value !== "object") return false;
  const c = value as Config;
  const numbers = [
    "ambient",
    "gpuPower",
    "cpuPower",
    "gpuLength",
    "gpuWidth",
    "gpuThickness",
    "coolerHeight",
    "coolerResistance",
    "gpuResistance",
    "restriction",
  ] as const;
  return (
    numbers.every(
      (key) =>
        typeof c[key] === "number" &&
        Number.isFinite(c[key]) &&
        c[key] >= 0 &&
        c[key] <= 1000,
    ) &&
    typeof c.sideBracket === "boolean" &&
    typeof c.gpuInstalled === "boolean" &&
    !!c.fans &&
    MOUNTS.every((m) => {
      const f = c.fans[m.id];
      return (
        f &&
        typeof f.installed === "boolean" &&
        ["intake", "exhaust"].includes(f.direction) &&
        [120, 140].includes(f.size) &&
        [15, 25].includes(f.thickness) &&
        Number.isFinite(f.rpm) &&
        f.rpm >= 0 &&
        f.rpm <= 3000
      );
    })
  );
}

export default function AirflowLab() {
  const [config, setConfig] = useState<Config>(() => clone(DEFAULT_CONFIG));
  const [selectedMount, setSelectedMount] = useState(MOUNTS[0].id);
  const [selection, setSelection] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<SVGLineElement>(null);
  const [view, setView] = useState<View>("perspective");
  const [resetKey, setResetKey] = useState(0);
  const [showAirflow, setShowAirflow] = useState(true);
  const [showPanels, setShowPanels] = useState(false);
  const [showComponents, setShowComponents] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [notice, setNotice] = useState("");
  const [auxiliary, setAuxiliary] = useState<
    "layouts" | "scenarios" | "method" | "fit" | null
  >(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [experience, setExperience] = useState<Experience>(DEFAULT_EXPERIENCE);
  const [selectedComponent, setSelectedComponent] = useState<HardwarePart>("gpu");
  const [studioOpen, setStudioOpen] = useState(false);
  const [experimentRunning, setExperimentRunning] = useState(false);
  const [comparison, setComparison] = useState<{ title: string; before: Config; after: Config } | null>(null);
  const [comparisonPhase, setComparisonPhase] = useState<"before" | "after" | null>(null);
  const experimentTimers = useRef<number[]>([]);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<
    "configuration" | "display" | null
  >(null);
  const toggleAuxiliary = (
    panel: "layouts" | "scenarios" | "method" | "fit",
  ) => {
    setPanelsVisible(true);
    setSelection(null); setStudioOpen(false); setMobilePanel(null);
    setAuxiliary((current) => (current === panel ? null : panel));
  };
  useEffect(() => {
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuxiliary(null);
        setMobilePanel(null);
        setStudioOpen(false);
        setSelection(null);
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
    };
  }, []);
  const result = evaluate(config);
  const selected = MOUNTS.find((m) => m.id === selectedMount) ?? MOUNTS[0];
  const fan = config.fans[selected.id];
  const patch = (values: Partial<Config>) =>
    setConfig((c) => ({ ...c, ...values }));
  const patchFan = (values: Partial<Fan>) =>
    setConfig((c) => ({
      ...c,
      fans: { ...c.fans, [selected.id]: { ...c.fans[selected.id], ...values } },
    }));
  const clearExperimentTimers = () => {
    experimentTimers.current.forEach((timer) => window.clearTimeout(timer));
    experimentTimers.current = [];
  };
  useEffect(() => () => clearExperimentTimers(), []);
  const runCinematic = (title: string, next: Config) => {
    if (experimentRunning) return;
    clearExperimentTimers();
    const before = clone(config);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setExperimentRunning(true);
    const originalExplode = experience.explode;
    setExperience((current) => ({ ...current, explode: Math.max(current.explode, 0.62) }));
    setComparisonPhase("before");
    setView("perspective");
    setResetKey((key) => key + 1);
    const rebuild = () => {
      setConfig(next);
      setComparison({ title, before, after: clone(next) });
      setComparisonPhase("after");
    };
    const settle = () => {
      setExperience((current) => ({ ...current, explode: originalExplode }));
      setExperimentRunning(false);
      experimentTimers.current = [];
    };
    if (reduced) { rebuild(); settle(); return; }
    experimentTimers.current = [
      window.setTimeout(rebuild, 600),
      window.setTimeout(settle, 1200),
    ];
  };
  const runExperiment = (kind: "reverse" | "reduce" | "gpu") => {
    const currentFan = config.fans[selectedMount];
    if ((kind === "reverse" || kind === "reduce") && !currentFan?.installed) return;
    if (kind === "reduce" && currentFan.rpm <= 0) return;
    if (kind === "gpu" && !config.gpuInstalled) return;
    setShowComponents(true);
    const next = clone(config);
    if (kind === "reverse") next.fans[selectedMount].direction = currentFan.direction === "intake" ? "exhaust" : "intake";
    if (kind === "reduce") next.fans[selectedMount].rpm = Math.max(0, currentFan.rpm - 450);
    if (kind === "gpu") next.gpuPower = next.gpuPower === 0 ? DEFAULT_CONFIG.gpuPower : Math.max(0, next.gpuPower - 90);
    if (kind === "reverse" || kind === "reduce") { setExperience((current) => ({ ...current, mode: "airflow" })); setShowAirflow(true); }
    if (kind === "gpu") setExperience((current) => ({ ...current, mode: "heat" }));
    runCinematic(kind === "reverse" ? `Reversed ${selected.label} fan` : kind === "reduce" ? `Reduced ${selected.label} speed` : "Adjusted GPU load", next);
  };
  const replayComparison = () => {
    if (!comparison || experimentRunning) return;
    clearExperimentTimers();
    setExperimentRunning(true);
    setConfig(clone(comparison.before));
    const originalExplode = experience.explode;
    setExperience((current) => ({ ...current, explode: Math.max(current.explode, 0.62) }));
    setComparisonPhase("before");
    const settle = () => { setExperience((current) => ({ ...current, explode: originalExplode })); setExperimentRunning(false); experimentTimers.current = []; };
    const after = () => { setConfig(clone(comparison.after)); setComparisonPhase("after"); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { after(); settle(); return; }
    experimentTimers.current = [window.setTimeout(after, 700), window.setTimeout(settle, 1300)];
  };
  const selectMount = (id: string) => {
    setSelectedMount(id);
    setSelection(id);
    setAuxiliary(null);
    setStudioOpen(false);
    setMobilePanel(null);
    setPanelsVisible(true);
  };
  useEffect(() => {
    try {
      const data: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]",
      );
      if (Array.isArray(data)) {
        const safe = data
          .filter(
            (v): v is Scenario =>
              !!v &&
              typeof v.id === "string" &&
              typeof v.name === "string" &&
              validConfig(v.config),
          )
          .slice(0, 6);
        queueMicrotask(() => setScenarios(safe));
      }
    } catch {
      /* An unavailable store does not block the lab. */
    }
  }, []);
  const persist = (next: Scenario[]) => {
    setScenarios(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotice("Scenarios saved on this device.");
    } catch {
      setNotice(
        "Browser storage is unavailable. Scenarios remain available until you close this page.",
      );
    }
  };
  const save = () => {
    if (scenarios.length >= 6) {
      setNotice("Remove a saved scenario to make room. You can keep six.");
      return;
    }
    persist([
      ...scenarios,
      {
        id: crypto.randomUUID(),
        name: scenarioName.trim() || `Scenario ${scenarios.length + 1}`,
        config: clone(config),
      },
    ]);
    setScenarioName("");
  };
  const pulseEnvelope =
    config.gpuLength === 313 &&
    config.gpuWidth === 133.75 &&
    config.gpuThickness === 52.67;
  const delta = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}°`;

  return (
    <main
      className={s.lab}
      data-panels={panelsVisible ? "visible" : "hidden"}
      data-mobile-panel={mobilePanel || "none"}
    >
      <div className={s.scene}>
        <CaseScene
          config={config}
          selectedMount={selectedMount}
          onSelectMount={selectMount}
          showAirflow={showAirflow}
          showPanels={showPanels}
          showComponents={showComponents}
          showDimensions={showDimensions}
          experience={experience}
          selection={selection}
          anchorRef={anchorRef}
          leaderRef={leaderRef}
          onDeselect={() => setSelection(null)}
          selectedComponent={selection && !MOUNTS.some(m => m.id === selection) ? selectedComponent : null}
          onSelectComponent={(part) => { setSelectedComponent(part); setSelection(part); setAuxiliary(null); setStudioOpen(false); setPanelsVisible(true); setMobilePanel(null); }}
          view={view}
          resetKey={resetKey}
        />
      </div>
      <header className={s.presentationHeader}>
        <div><h1>Airflow</h1><span>Lian Li B4-mATX</span></div>
        <Link href="/" aria-label="Return to portfolio">Close</Link>
      </header>

      {mobilePanel === "display" ? <FloatingPanel title="Scene settings" code="" className={s.overview} onClose={() => setMobilePanel(null)}>
        <div className={s.displaySection}>
          <Toggle checked={showAirflow} onChange={setShowAirflow}>
            Airflow
          </Toggle>
          <Toggle checked={showPanels} onChange={setShowPanels}>
            Mesh panels
          </Toggle>
          <Toggle checked={showComponents} onChange={setShowComponents}>
            Components
          </Toggle>
          <Toggle checked={showDimensions} onChange={setShowDimensions}>
            Dimensions
          </Toggle>
        </div>
        <div className={s.displaySection}><Dial label="Ambient temperature" value={config.ambient} min={10} max={40} step={1} unit="°C" onChange={(ambient) => patch({ ambient })} /><Dial label="Airflow restriction" value={config.restriction} min={0} max={0.9} step={0.05} unit="ratio" onChange={(restriction) => patch({ restriction })} /><Toggle checked={config.sideBracket} onChange={(sideBracket) => patch({sideBracket})}>Side fan bracket</Toggle>
<details><summary>Select a component</summary><div className={s.partPicker}>{(Object.keys(PART_INFO) as HardwarePart[]).map(part => <button key={part} onClick={() => {setSelectedComponent(part);setSelection(part);setMobilePanel(null);}}>{PART_INFO[part].title}</button>)}{MOUNTS.map(m => <button key={m.id} onClick={() => selectMount(m.id)}>{m.label} fan</button>)}</div></details></div>
        <div className={s.overviewActions}>
          <button onClick={() => toggleAuxiliary("scenarios")}>Saved builds</button>
          <button onClick={() => toggleAuxiliary("method")}>About this model</button>
          <button onClick={() => { setConfig(clone(DEFAULT_CONFIG)); setNotice("Default build restored."); }}>Reset build</button>
          <button onClick={() => toggleAuxiliary("layouts")}>
            Fan layouts<span>↗</span>
          </button>
          <button
            onClick={() => toggleAuxiliary("fit")}
            className={result.issues.length ? s.hasIssues : ""}
          >
            Clearance checks
            <span>
              {result.issues.length
                ? `${result.issues.length} to review`
                : "CLEAR ✓"}
            </span>
          </button>
        </div>
      </FloatingPanel> : null}

      {selection && panelsVisible ? <svg className={s.contextLeader} aria-hidden="true"><line ref={leaderRef} /></svg> : null}
      {selection && panelsVisible ? <div ref={anchorRef} className={s.componentPopover} role="region" aria-label="Component controls">
        <header><div><h2>{MOUNTS.some(m => m.id === selection) ? selected.label + " fan" : PART_INFO[selectedComponent].title}</h2></div><button aria-label="Close component controls" onClick={() => setSelection(null)}>×</button></header>
        <div className={s.contextBody} inert={experimentRunning}>
        {MOUNTS.some(m => m.id === selection) ? <>
              <div className={s.fanEditor}>
                <div className={s.sectionTitle}>
                  <h3>{selected.label}</h3>
                  <span className={s.mountTag}>
                    {fan.installed ? `${fan.size} mm` : "Empty"}
                  </span>
                </div>
                <Toggle
                  checked={fan.installed}
                  onChange={(installed) => patchFan({ installed })}
                >
                  Fan installed
                </Toggle>
                <fieldset disabled={!fan.installed} className={s.fanSettings}>
                  <legend className={s.srOnly}>Selected fan settings</legend>
                  <span className={s.fieldLabel}>Air direction</span>
                  <div className={s.direction}>
                    <button
                      aria-pressed={fan.direction === "intake"}
                      className={
                        fan.direction === "intake" ? s.activeIntake : ""
                      }
                      onClick={() => patchFan({ direction: "intake" })}
                    >
                      ↘ Intake
                    </button>
                    <button
                      aria-pressed={fan.direction === "exhaust"}
                      className={
                        fan.direction === "exhaust" ? s.activeExhaust : ""
                      }
                      onClick={() => patchFan({ direction: "exhaust" })}
                    >
                      ↗ Exhaust
                    </button>
                  </div>
                  <Dial
                    label="Fan speed"
                    value={fan.rpm}
                    min={0}
                    max={2400}
                    step={100}
                    unit="RPM"
                    onChange={(rpm) => patchFan({ rpm })}
                  />
                  <details><summary>Fan dimensions</summary><div className={s.selectPair}>
                    <label>
                      Diameter
                      <select
                        value={fan.size}
                        onChange={(e) =>
                          patchFan({
                            size: Number(e.target.value) as 120 | 140,
                          })
                        }
                      >
                        <option value="120">120 mm</option>
                        <option
                          value="140"
                          disabled={!["side", "bottom"].includes(selected.zone)}
                        >
                          140 mm
                        </option>
                      </select>
                    </label>
                    <label>
                      Thickness
                      <select
                        value={fan.thickness}
                        onChange={(e) =>
                          patchFan({
                            thickness: Number(e.target.value) as 15 | 25,
                          })
                        }
                      >
                        <option value="15">15 mm · slim</option>
                        <option
                          value="25"
                          disabled={["top", "front"].includes(selected.zone)}
                        >
                          25 mm · standard
                        </option>
                      </select>
                    </label>
                  </div>
                  </details>
                </fieldset>
              </div>
<Toggle checked={experience.isolateFlow} onChange={(isolateFlow) => { setExperience(c => ({...c, isolateFlow})); setShowAirflow(true); }}>Isolate airflow</Toggle>
        <button className={s.contextAction} disabled={!fan.installed} onClick={() => { runExperiment("reverse"); }}>Compare reversed airflow</button><button className={s.contextAction} disabled={!fan.installed || fan.rpm <= 0} onClick={() => runExperiment("reduce")}>Compare lower speed</button>
        </> : selectedComponent === "gpu" ? <>
<Dial label="GPU heat load" value={config.gpuPower} min={0} max={400} step={5} unit="W" onChange={(gpuPower) => patch({ gpuPower })} /><p className={s.help}>Estimated GPU temperature · {config.gpuInstalled ? result.gpuTemp.toFixed(0) + "°C" : "Not installed"}</p>
<details><summary>Dimensions & cooling</summary>              <div className={s.componentTitle}>
                <span className={s.chip}>GPU</span>
                <div>
                  <h3>
                    {pulseEnvelope ? "Sapphire Pulse" : "Custom GPU envelope"}
                  </h3>
                  <p>
                    {pulseEnvelope
                      ? "Radeon RX 7900 XT · 20 GB"
                      : "Based on the Pulse cooling model"}
                  </p>
                </div>
              </div>
              <Toggle
                checked={config.gpuInstalled}
                onChange={(gpuInstalled) => patch({ gpuInstalled })}
              >
                GPU installed
              </Toggle>
              <p className={s.help}>
                Edit the envelope below to explore a replacement card. Cooler
                behavior remains generic and adjustable under Conditions.
              </p>
              <Dial
                label="GPU length"
                value={config.gpuLength}
                min={150}
                max={400}
                unit="mm"
                onChange={(gpuLength) => patch({ gpuLength })}
              />
              <Dial
                label="GPU width"
                value={config.gpuWidth}
                min={80}
                max={180}
                step={0.25}
                unit="mm"
                onChange={(gpuWidth) => patch({ gpuWidth })}
              />
              <Dial
                label="GPU thickness"
                value={config.gpuThickness}
                min={20}
                max={90}
                step={0.1}
                unit="mm"
                onChange={(gpuThickness) => patch({ gpuThickness })}
              />
              <button
                className={s.textButton}
                onClick={() =>
                  patch({
                    gpuLength: 313,
                    gpuWidth: 133.75,
                    gpuThickness: 52.67,
                    gpuInstalled: true,
                  })
                }
              >
                Restore Pulse dimensions
              </button>
<Dial label="GPU thermal resistance" value={config.gpuResistance} min={0.05} max={0.3} step={0.01} unit="°C/W" onChange={(gpuResistance) => patch({ gpuResistance })} /></details>
<button className={s.contextAction} disabled={!config.gpuInstalled} onClick={() => runExperiment("gpu")}>Compare {config.gpuPower === 0 ? "restored" : "lower"} load</button>
</> : selectedComponent === "cooler" || selectedComponent === "motherboard" ? <>
<Dial label="CPU heat load" value={config.cpuPower} min={0} max={160} step={5} unit="W" onChange={(cpuPower) => patch({ cpuPower })} /><p className={s.help}>Estimated CPU temperature · {result.cpuTemp.toFixed(0)}°C</p><details><summary>Cooler geometry & performance</summary>              <Dial
                label="Tower cooler height"
                value={config.coolerHeight}
                min={45}
                max={180}
                unit="mm"
                onChange={(coolerHeight) => patch({ coolerHeight })}
              />
<Dial label="CPU thermal resistance" value={config.coolerResistance} min={0.1} max={0.7} step={0.01} unit="°C/W" onChange={(coolerResistance) => patch({ coolerResistance })} /></details></> : <><p>{PART_INFO.psu.detail}</p><p className={s.help}>{PART_INFO.psu.dimensions}</p></>}
        </div>
        {comparison ? <div className={s.contextComparison}><span>{comparison.title} · {comparisonPhase}</span><div><button disabled={experimentRunning} onClick={() => {setConfig(clone(comparison.before)); setComparisonPhase("before");}}>Before</button><button disabled={experimentRunning} onClick={() => {setConfig(clone(comparison.after)); setComparisonPhase("after");}}>After</button><button disabled={experimentRunning} onClick={replayComparison}>Replay</button><button disabled={experimentRunning} onClick={() => {setConfig(clone(comparison.before));setComparison(null);}}>Undo</button><button disabled={experimentRunning} onClick={() => {setConfig(clone(comparison.after));setComparison(null);}}>Keep</button></div></div> : null}
      </div> : null}
      {experience.mode === "heat" ? <div className={s.temperatureKey} aria-label="Estimated temperature colors: teal is cooler, amber is warm, coral is hotter"><span>Cooler</span><i aria-hidden="true" /><span>Hotter</span></div> : null}

      <div
        className={s.canvasTools}
        role="toolbar"
        aria-label="Canvas controls"
      >
        <div className={s.viewControls} aria-label="Camera view">
          <select aria-label="Camera view" value={view} onChange={e => setView(e.target.value as View)}>{(["perspective","side","front","rear","top"] as const).map(v => <option key={v} value={v}>{v === "perspective" ? "3D view" : v + " view"}</option>)}</select>
          <button
            aria-label="Reset camera"
            title="Fit model"
            onClick={() => {
              setView("perspective");
              setResetKey((k) => k + 1);
            }}
          >
            ⌖
          </button>
        </div>
        <button
          className={s.studioButton}
          aria-pressed={studioOpen}
          onClick={() => {
            setPanelsVisible(true);
            setStudioOpen((open) => !open);
            setSelection(null); setMobilePanel(null);
          }}
        >
          View
        </button>
        <button className={s.studioButton} aria-expanded={mobilePanel === "display"} onClick={() => {setMobilePanel(p => p === "display" ? null : "display");setStudioOpen(false);setSelection(null);setPanelsVisible(true);}}>Scene</button>
      </div>

      {studioOpen && panelsVisible ? (
        <ExperiencePanel
          experience={experience}
          selectedComponent={selectedComponent}
          config={config}
          selectedFanInstalled={fan.installed}
          selectedFanRpm={fan.rpm}
          running={experimentRunning}
          comparisonPhase={comparisonPhase}
          comparison={comparison}
          onExperienceChange={(next) => {
            setExperience((current) => ({ ...current, ...next }));
            if (next.mode === "airflow") setShowAirflow(true);
            if (next.mode) setShowComponents(true);
            if (typeof next.explode === "number" && next.explode > 0) {
              setShowComponents(true);
              setShowPanels(true);
            }
          }}
          onSelectComponent={setSelectedComponent}
          onExperiment={runExperiment}
          onUndo={() => {
            if (!comparison) return;
            clearExperimentTimers();
            setConfig(clone(comparison.before));
            setComparison(null);
            setComparisonPhase(null);
            setExperimentRunning(false);
            setNotice("Experiment reverted.");
          }}
          onKeep={() => {
            if (!comparison) return;
            clearExperimentTimers();
            setConfig(clone(comparison.after));
            setComparison(null);
            setComparisonPhase(null);
            setExperimentRunning(false);
            setNotice("Experiment kept in the current build.");
          }}
          onReplay={replayComparison}
          onShowBefore={() => {
            if (!comparison || experimentRunning) return;
            clearExperimentTimers(); setConfig(clone(comparison.before)); setComparisonPhase("before");
          }}
          onShowAfter={() => {
            if (!comparison || experimentRunning) return;
            clearExperimentTimers(); setConfig(clone(comparison.after)); setComparisonPhase("after");
          }}
          onClose={() => setStudioOpen(false)}
        />
      ) : null}

      {auxiliary ? (
        <FloatingPanel
          key={auxiliary}
          title={
            auxiliary === "layouts"
              ? "Fan layouts"
              : auxiliary === "scenarios"
                ? "Scenarios"
                : auxiliary === "fit"
                  ? "Clearance checks"
                  : "Model notes"
          }
          code="REF"
          className={s.auxiliary}
          onClose={() => setAuxiliary(null)}
        >
          {auxiliary === "layouts" ? (
            <>
              {" "}
              <div className={s.presets}>
                <div className={s.sectionTitle}>
                  <h2>Start with a layout</h2>
                  <span>Replaces current configuration</span>
                </div>
                <div className={s.presetGrid}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className={s.preset}
                      onClick={() => {
                        setConfig(clone(p.config));
                        setNotice(`${p.label} loaded.`);
                      }}
                    >
                      <FanIcon />
                      <strong>{p.label}</strong>
                      <span>{p.description}</span>
                      <b aria-hidden="true">↗</b>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : auxiliary === "fit" ? (
            <>
              {" "}
              <div className={s.fitPanel}>
                <div className={s.sectionTitle}>
                  <h2>Fit & compatibility</h2>
                  <span
                    className={
                      result.issues.some((i) => i.severity === "error")
                        ? s.errorText
                        : ""
                    }
                  >
                    {result.issues.some((i) => i.severity === "error")
                      ? "Review conflicts"
                      : "Envelope check"}
                  </span>
                </div>
                {result.issues.length ? (
                  <ul className={s.issues}>
                    {result.issues.map((issue, i) => (
                      <li
                        key={`${issue.id}-${i}`}
                        className={
                          issue.severity === "error" ? s.errorIssue : ""
                        }
                      >
                        <span>{issue.severity === "error" ? "!" : "i"}</span>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.fitOkay}>
                    ✓ No conflicts found in the modeled clearances. Check cables
                    and mounting details before building.
                  </p>
                )}
              </div>
            </>
          ) : auxiliary === "scenarios" ? (
            <>
              {" "}
              <section
                className={s.comparison}
                aria-label="Saved scenario comparison"
              >
                <div className={s.comparisonHeading}>
                  <div>
                    <span className={s.eyebrow}>COMPARE CONFIGURATIONS</span>
                    <h2>Keep a scenario. Try another.</h2>
                  </div>
                  <form
                    className={s.saveForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                  >
                    <input
                      aria-label="Scenario name"
                      value={scenarioName}
                      maxLength={40}
                      placeholder="Name this scenario"
                      onChange={(e) => setScenarioName(e.target.value)}
                    />
                    <button type="submit">＋ Save scenario</button>
                  </form>
                </div>
                <p className={s.status} role="status">
                  {notice ||
                    "Saved locally on this device. Temperature differences are relative to the current build."}
                </p>
                {scenarios.length ? (
                  <div className={s.scenarioGrid}>
                    {scenarios.map((sc) => {
                      const r = evaluate(sc.config);
                      return (
                        <article className={s.scenarioCard} key={sc.id}>
                          <div className={s.sectionTitle}>
                            <h3>{sc.name}</h3>
                            <button
                              aria-label={`Delete ${sc.name}`}
                              onClick={() =>
                                persist(scenarios.filter((v) => v.id !== sc.id))
                              }
                            >
                              ×
                            </button>
                          </div>
                          <div className={s.scenarioStats}>
                            <div>
                              <span>CPU</span>
                              <strong>{r.cpuTemp.toFixed(0)}°</strong>
                              <small>{delta(r.cpuTemp - result.cpuTemp)}</small>
                            </div>
                            <div>
                              <span>GPU</span>
                              <strong>
                                {sc.config.gpuInstalled
                                  ? `${r.gpuTemp.toFixed(0)}°`
                                  : "—"}
                              </strong>
                              <small>
                                {sc.config.gpuInstalled && config.gpuInstalled
                                  ? delta(r.gpuTemp - result.gpuTemp)
                                  : "—"}
                              </small>
                            </div>
                            <div>
                              <span>AIR RISE</span>
                              <strong>+{r.airRise.toFixed(1)}°</strong>
                              <small>{r.activeFans} active fans</small>
                            </div>
                          </div>
                          <button
                            className={s.loadScenario}
                            onClick={() => {
                              setConfig(clone(sc.config));
                              setNotice(`${sc.name} loaded.`);
                            }}
                          >
                            Load configuration ↗
                          </button>
                          <button
                            className={s.loadScenario}
                            disabled={experimentRunning}
                            onClick={() => runCinematic(`Comparing ${sc.name}`, clone(sc.config))}
                          >
                            Compare A/B
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className={s.emptyScenarios}>
                    <p>
                      Save your current build to compare temperatures and
                      airflow as you move fans around.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              {" "}
              <section className={s.method} aria-label="Model assumptions">
                <div>
                  <h2>What the model can tell you</h2>
                  <p>
                    Fan direction, position, speed and restriction feed a
                    simplified air-exchange calculation. Heat load and thermal
                    resistance turn that into a steady-state estimate. The
                    animation illustrates direction; it does not solve the
                    airflow field.
                  </p>
                  <ul>
                    {MODEL_NOTES.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Hardware references</h3>
                  {SOURCES.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.label} ↗
                    </a>
                  ))}
                  <p>
                    Generic fan curves, cooler geometry and thermal coefficients
                    are assumptions. Actual boost behavior, GPU hotspot
                    temperatures and transient loads are not simulated.
                  </p>
                </div>
              </section>
            </>
          )}
        </FloatingPanel>
      ) : null}
      <span className={s.srOnly} role="status">
        {notice}
      </span>
    </main>
  );
}
