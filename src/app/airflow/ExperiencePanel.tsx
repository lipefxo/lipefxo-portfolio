"use client";

import { evaluate, type Config } from "./model";
import {
  type Experience,
  type HardwarePart,
  type LensMode,
} from "./experience";
import FloatingPanel from "./FloatingPanel";
import s from "./ExperiencePanel.module.css";

type Comparison = {
  title: string;
  before: Config;
  after: Config;
};

export default function ExperiencePanel({
  experience,
  config,
  running,
  comparisonPhase,
  comparison,
  onExperienceChange,
  onUndo,
  onKeep,
  onReplay,
  onShowBefore,
  onShowAfter,
  onClose,
}: {
  experience: Experience;
  selectedComponent: HardwarePart;
  config: Config;
  selectedFanInstalled: boolean;
  selectedFanRpm: number;
  running: boolean;
  comparisonPhase: "before" | "after" | null;
  comparison: Comparison | null;
  onExperienceChange: (next: Partial<Experience>) => void;
  onSelectComponent: (part: HardwarePart) => void;
  onExperiment: (kind: "reverse" | "reduce" | "gpu") => void;
  onUndo: () => void;
  onKeep: () => void;
  onReplay: () => void;
  onShowBefore: () => void;
  onShowAfter: () => void;
  onClose: () => void;
}) {
  const beforeEstimate = comparison ? evaluate(comparison.before) : null;
  const afterEstimate = comparison ? evaluate(comparison.after) : null;
  const delta = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}°C`;
  return (
    <FloatingPanel title="View" code="" className={s.panel} onClose={onClose}>
      <div className={s.content} aria-busy={running}>
        <div className={s.tabs} role="tablist" aria-label="Visualization lens">
          {(["hardware", "airflow", "heat"] as LensMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={experience.mode === mode}
              disabled={running} onClick={() => onExperienceChange({ mode })}
            >
              {mode}
            </button>
          ))}
        </div>
        <label className={s.range}>
          <span>Exploded assembly <b>{Math.round(experience.explode * 100)}%</b></span>
          <input disabled={running} type="range" min="0" max="1" step="0.05" value={experience.explode} onChange={(e) => onExperienceChange({ explode: Number(e.target.value) })} />
        </label>
        <div className={s.cutaway}>
          <label><span>Section cut</span><input disabled={running} type="checkbox" checked={experience.sectionEnabled} onChange={(e) => onExperienceChange({ sectionEnabled: e.target.checked })} /></label>
          {experience.sectionEnabled ? <input disabled={running} aria-label="Section cut depth" type="range" min="0" max="1" step="0.05" value={experience.section} onChange={(e) => onExperienceChange({ section: Number(e.target.value) })} /> : null}
        </div>
        {experience.mode === "heat" ? <><p className={s.disclaimer}>Illustrative heat sources, not a temperature simulation.</p><div className={s.heatLegend}><span><i className={s.cpu} />CPU {config.cpuPower} W</span><span><i className={s.gpu} />GPU {config.gpuInstalled ? config.gpuPower : 0} W</span></div></> : null}
        {comparison ? <div className={s.comparison} role="status">
          <strong>{comparison.title} · {comparisonPhase === "before" ? "Before" : "After"}</strong>
          <span>CPU {beforeEstimate!.cpuTemp.toFixed(0)}° → {afterEstimate!.cpuTemp.toFixed(0)}° ({delta(afterEstimate!.cpuTemp - beforeEstimate!.cpuTemp)})</span>
          <span>GPU {comparison.before.gpuInstalled ? `${beforeEstimate!.gpuTemp.toFixed(0)}°` : "—"} → {comparison.after.gpuInstalled ? `${afterEstimate!.gpuTemp.toFixed(0)}°` : "—"}{comparison.before.gpuInstalled && comparison.after.gpuInstalled ? ` (${delta(afterEstimate!.gpuTemp - beforeEstimate!.gpuTemp)})` : ""}</span>
          <div><button disabled={running} onClick={onShowBefore}>Before</button><button disabled={running} onClick={onShowAfter}>After</button><button disabled={running} onClick={onReplay}>Replay A/B</button><button disabled={running} onClick={onUndo}>Undo</button><button disabled={running} onClick={onKeep}>Keep</button></div>
        </div> : null}
      </div>
    </FloatingPanel>
  );
}
