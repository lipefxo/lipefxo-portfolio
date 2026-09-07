export type HardwarePart = "motherboard" | "cooler" | "gpu" | "psu";
export type LensMode = "hardware" | "airflow" | "heat";
export type CameraView = "perspective" | "side" | "front" | "rear" | "top";
export type Experience = {
  mode: LensMode;
  explode: number;
  sectionEnabled: boolean;
  /** 0..1, moving the cut from the visible side toward the motherboard. */
  section: number;
  isolateFlow: boolean;
};
export const DEFAULT_EXPERIENCE: Experience = {
  mode: "hardware", explode: 0, sectionEnabled: false, section: 0.35, isolateFlow: false,
};
export const PART_INFO: Record<HardwarePart, { title: string; detail: string; dimensions: string }> = {
  motherboard: { title: "AM5 motherboard", detail: "Generic micro-ATX board · rear I/O and DIMMs", dimensions: "244 × 244 mm" },
  cooler: { title: "CPU tower cooler", detail: "Aluminum fin stack · four copper heatpipes", dimensions: "Height follows your configuration" },
  gpu: { title: "Sapphire PULSE RX 7900 XT", detail: "Triple-fan cooler · 20 GB GDDR6", dimensions: "313 × 133.75 × 52.67 mm by default" },
  psu: { title: "Corsair SF1000", detail: "SFX power supply · modular cable harness", dimensions: "100 × 63.5 × 125 mm" },
};
