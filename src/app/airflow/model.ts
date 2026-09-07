/**
 * A deliberately lightweight, steady-state airflow model. It is intended for
 * comparing fan layouts, not replacing CFD or measured component temperatures.
 */
export type MountId = string;

export type Fan = {
  installed: boolean;
  direction: "intake" | "exhaust";
  rpm: number;
  size: 120 | 140;
  thickness: 15 | 25;
};

export type Config = {
  fans: Record<string, Fan>;
  ambient: number;
  gpuPower: number;
  cpuPower: number;
  gpuLength: number;
  gpuWidth: number;
  gpuThickness: number;
  coolerHeight: number;
  coolerResistance: number;
  gpuResistance: number;
  restriction: number;
  sideBracket: boolean;
  gpuInstalled: boolean;
};

export type Mount = {
  id: MountId;
  label: string;
  zone: "top" | "bottom" | "side" | "front" | "rear";
  /** Millimetres: x runs rear to front, y runs bottom to top, z points out the visible side. */
  position: [number, number, number];
  /** Direction out of the chassis for an exhaust fan. */
  normal: [number, number, number];
};

export type Issue = {
  id: string;
  severity: "warning" | "error";
  message: string;
};

export type Evaluation = {
  intakeCfm: number;
  exhaustCfm: number;
  effectiveCfm: number;
  pressure: "Positive" | "Negative" | "Balanced";
  airRise: number;
  cpuTemp: number;
  gpuTemp: number;
  issues: Issue[];
  activeFans: number;
  /** Installed mount IDs omitted from flow estimates due to a detected conflict. */
  invalidFanIds: string[];
};

export const MOUNTS: Mount[] = [
  {
    id: "top-rear",
    label: "Top rear",
    zone: "top",
    position: [-70, 144, 0],
    normal: [0, 1, 0],
  },
  {
    id: "top-front",
    label: "Top front",
    zone: "top",
    position: [70, 144, 0],
    normal: [0, 1, 0],
  },
  {
    id: "bottom-rear",
    label: "Bottom rear",
    zone: "bottom",
    position: [-120, -144, 8],
    normal: [0, -1, 0],
  },
  {
    id: "bottom-middle",
    label: "Bottom middle",
    zone: "bottom",
    position: [0, -144, 8],
    normal: [0, -1, 0],
  },
  {
    id: "bottom-front",
    label: "Bottom front",
    zone: "bottom",
    position: [120, -144, 8],
    normal: [0, -1, 0],
  },
  {
    id: "side-rear",
    label: "Side rear",
    zone: "side",
    position: [-120, 15, 96],
    normal: [0, 0, 1],
  },
  {
    id: "side-middle",
    label: "Side middle",
    zone: "side",
    position: [0, 15, 96],
    normal: [0, 0, 1],
  },
  {
    id: "side-front",
    label: "Side front",
    zone: "side",
    position: [120, 15, 96],
    normal: [0, 0, 1],
  },
  {
    id: "front",
    label: "Front",
    zone: "front",
    position: [210, 0, 0],
    normal: [1, 0, 0],
  },
  {
    id: "rear",
    label: "Rear",
    zone: "rear",
    position: [-210, 35, 32],
    normal: [-1, 0, 0],
  },
];

const fan = (
  direction: Fan["direction"],
  size: Fan["size"] = 120,
  thickness: Fan["thickness"] = 15,
): Fan => ({
  installed: true,
  direction,
  rpm: 1150,
  size,
  thickness,
});

const emptyFan = (): Fan => ({
  installed: false,
  direction: "intake",
  rpm: 1150,
  size: 120,
  thickness: 15,
});

const baseFans = (): Record<string, Fan> =>
  Object.fromEntries(MOUNTS.map(({ id }) => [id, emptyFan()]));

export const DEFAULT_CONFIG: Config = {
  fans: {
    ...baseFans(),
    "bottom-rear": fan("intake"),
    "bottom-middle": fan("intake"),
    "bottom-front": fan("intake"),
    "top-rear": fan("exhaust"),
    "top-front": fan("exhaust"),
  },
  ambient: 23,
  gpuPower: 315,
  cpuPower: 105,
  gpuLength: 313,
  gpuWidth: 133.75,
  gpuThickness: 52.67,
  coolerHeight: 155,
  coolerResistance: 0.28,
  gpuResistance: 0.19,
  restriction: 0.15,
  sideBracket: false,
  gpuInstalled: true,
};

const cloneConfig = (overrides: Partial<Config> = {}): Config => ({
  ...DEFAULT_CONFIG,
  ...overrides,
  fans: { ...DEFAULT_CONFIG.fans, ...(overrides.fans ?? {}) },
});

export const PRESETS: {
  id: string;
  label: string;
  description: string;
  config: Config;
}[] = [
  {
    id: "balanced-stock",
    label: "Balanced bottom-to-top",
    description:
      "Three slim bottom intakes and two slim top exhausts feed the Pulse directly and vent heat upward.",
    config: cloneConfig(),
  },
  {
    id: "gpu-priority",
    label: "GPU priority",
    description:
      "Bottom intakes run faster while a rear exhaust helps draw the GPU plume through the case.",
    config: cloneConfig({
      fans: {
        ...baseFans(),
        "bottom-rear": { ...fan("intake"), rpm: 1500 },
        "bottom-middle": { ...fan("intake"), rpm: 1500 },
        "bottom-front": { ...fan("intake"), rpm: 1500 },
        "top-rear": fan("exhaust"),
        rear: fan("exhaust"),
      },
    }),
  },
  {
    id: "quiet-positive",
    label: "Low-RPM positive pressure",
    description:
      "Lower-RPM intakes slightly exceed exhaust flow in the model for a quieter starting point.",
    config: cloneConfig({
      fans: {
        ...baseFans(),
        "bottom-rear": { ...fan("intake"), rpm: 900 },
        "bottom-middle": { ...fan("intake"), rpm: 900 },
        "bottom-front": { ...fan("intake"), rpm: 900 },
        "top-rear": { ...fan("exhaust"), rpm: 700 },
        "top-front": { ...fan("exhaust"), rpm: 700 },
      },
    }),
  },
];

export const SOURCES = [
  {
    label: "Lian Li B4-mATX product page",
    url: "https://lian-li.com/product/b4-matx/",
  },
  {
    label: "Sapphire PULSE RX 7900 XT specifications",
    url: "https://www.sapphiretech.com/en/consumer/pulse-radeon-rx-7900-xt-20g-gddr6",
  },
  {
    label: "AMD Ryzen 7 7700X specifications",
    url: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7700x.html",
  },
  {
    label: "Corsair SF1000 specifications",
    url: "https://www.corsair.com/us/en/p/psu/cp-9020257-na/sf-series-sf1000-fully-modular-80-plus-platinum-sfx-power-supply-cp-9020257-na",
  },
];

export const MODEL_NOTES = [
  "Temperatures are heuristic steady-state estimates for comparing layouts; this is not a CFD simulation or a component warranty prediction.",
  "The model uses nominal fan flow, RPM, balance, placement, airflow restriction, component heat load, and user-adjustable thermal resistance. Pressure is a nominal-flow balance, not a measured pressure value.",
  "The default CPU load is 105 W for the Ryzen 7 7700X and the default GPU load is 315 W for the Sapphire PULSE RX 7900 XT.",
  "Invalid fan placements are omitted from airflow totals wherever a physical conflict can be identified.",
  "Air-temperature rise uses 0.569 W/K per CFM (air density 1.2 kg/m³, specific heat 1005 J/kg·K) plus a 16 W/K passive chassis term. Component resistance is reduced by the model's local airflow response; these coefficients are assumptions for comparison.",
];

const cfmForFan = (value: Fan) => {
  const nominal = value.size === 140 ? 82 : 62;
  const thicknessFactor = value.thickness === 15 ? 0.78 : 1;
  return (
    ((nominal * Math.max(0, Math.min(value.rpm, 2400))) / 1500) *
    thicknessFactor
  );
};

const zoneFor = (id: string) => MOUNTS.find((mount) => mount.id === id)?.zone;
const BANKS: Record<"top" | "bottom" | "side", MountId[]> = {
  top: ["top-rear", "top-front"],
  bottom: ["bottom-rear", "bottom-middle", "bottom-front"],
  side: ["side-rear", "side-middle", "side-front"],
};
const AIR_HEAT_CAPACITY_PER_CFM = 0.569;
const PASSIVE_CHASSIS_CONDUCTANCE = 16;

/** Illustrative automatic fan curves; local circulation is not chassis air exchange. */
export function componentCooling(config: Config) {
  const cpuRpm = Math.min(1800, 650 + Math.max(0, config.cpuPower) * 6);
  const gpuRpm = config.gpuInstalled ? Math.min(2400, 700 + Math.max(0, config.gpuPower) * 4) : 0;
  const gpuFans = config.gpuLength < 220 ? 2 : 3;
  return { cpuRpm, gpuRpm, cpuCfm: cpuRpm / 1800 * 48, gpuCfm: gpuRpm / 2400 * gpuFans * 19 };
}

export function evaluate(config: Config): Evaluation {
  const issues: Issue[] = [];
  const invalid = new Set<string>();
  const installed = Object.entries(config.fans).filter(
    ([, value]) => value.installed,
  );
  const addIssue = (id: string, severity: Issue["severity"], message: string) =>
    issues.push({ id, severity, message });

  if (config.gpuInstalled && config.gpuLength > 358)
    addIssue(
      "gpu-length",
      "error",
      `GPU length ${config.gpuLength} mm exceeds the B4-mATX 358 mm maximum.`,
    );
  if (config.gpuInstalled && config.gpuThickness / 20.32 > 4)
    addIssue(
      "gpu-thickness",
      "error",
      `GPU thickness ${(config.gpuThickness / 20.32).toFixed(1)} slots exceeds the model's 4-slot supported envelope.`,
    );
  if (config.gpuInstalled && config.gpuWidth > 150)
    addIssue(
      "gpu-width-cable",
      "warning",
      `GPU width ${config.gpuWidth} mm may leave limited cable-bend room; this is an approximate warning, not a verified B4-mATX width limit.`,
    );
  if (config.coolerHeight > (config.sideBracket ? 159 : 165))
    addIssue(
      "cooler-height",
      "error",
      `Cooler height ${config.coolerHeight} mm exceeds the ${config.sideBracket ? 159 : 165} mm clearance for this configuration.`,
    );

  for (const [id, value] of installed) {
    const zone = zoneFor(id);
    if (!zone) {
      invalid.add(id);
      addIssue(
        `unknown-mount-${id}`,
        "error",
        `“${id}” is not a B4-mATX fan mount.`,
      );
      continue;
    }
    if (zone === "top" && (value.size !== 120 || value.thickness !== 15)) {
      invalid.add(id);
      addIssue(
        `top-${id}`,
        "error",
        `${id} accepts 120 mm × 15 mm slim fans only.`,
      );
    }
    if ((zone === "front" || zone === "rear") && value.size !== 120) {
      invalid.add(id);
      addIssue(
        `${zone}-size`,
        "error",
        `The ${zone} mount accepts a 120 mm fan only.`,
      );
    }
    if (zone === "front" && value.thickness !== 15) {
      invalid.add(id);
      addIssue(
        "front-thickness",
        "error",
        "The front mount supports a 15 mm slim fan only.",
      );
    }
    if (zone === "front" && config.gpuInstalled && config.gpuLength > 343) {
      invalid.add(id);
      addIssue(
        "front-gpu-clearance",
        "error",
        `A front slim fan limits GPU length to 343 mm; the configured GPU is ${config.gpuLength} mm.`,
      );
    }
    if (zone === "bottom" && config.gpuInstalled) {
      const slots = config.gpuThickness / 20.32;
      if (slots >= 3.5) {
        invalid.add(id);
        addIssue(
          `bottom-gpu-${id}`,
          "error",
          "Bottom fans are unavailable with a GPU 3.5 slots or thicker.",
        );
      } else if (slots > 2.5 && value.thickness !== 15) {
        invalid.add(id);
        addIssue(
          `bottom-slim-${id}`,
          "error",
          "A GPU over 2.5 slots requires 15 mm slim bottom fans.",
        );
      }
    }
    if (zone === "side" && !config.sideBracket) {
      invalid.add(id);
      addIssue(
        `side-bracket-${id}`,
        "error",
        `${id} requires the optional side fan bracket.`,
      );
    }
    // Conservative spatial envelope: a tower cooler is centered near the rear
    // half of the board. The rear mount overlaps first; the middle mount can
    // overlap only with a very tall tower. The front mount remains clear.
    if (
      zone === "side" &&
      config.sideBracket &&
      ((id === "side-rear" && config.coolerHeight > 120) ||
        (id === "side-middle" && config.coolerHeight > 150))
    ) {
      invalid.add(id);
      addIssue(
        `side-cooler-${id}`,
        "warning",
        `${id} may overlap the ${config.coolerHeight} mm tower-cooler envelope; this conservative estimate omits it. Verify the cooler's plan-view drawing.`,
      );
    }
    if (value.rpm <= 0)
      addIssue(
        `stopped-fan-${id}`,
        "warning",
        `${id} is installed but stopped, so it contributes no airflow.`,
      );
  }

  for (const [bank, ids] of Object.entries(BANKS) as [
    keyof typeof BANKS,
    MountId[],
  ][]) {
    const bankFans = installed.filter(([id]) => ids.includes(id));
    if (new Set(bankFans.map(([, value]) => value.size)).size > 1) {
      bankFans.forEach(([id]) => invalid.add(id));
      addIssue(
        `mixed-bank-${bank}`,
        "error",
        `The ${bank} bank cannot mix 120 mm and 140 mm fans; its fans are omitted from the estimate.`,
      );
    }
    const fans140 = bankFans.filter(([, value]) => value.size === 140);
    if (fans140.length > 2) {
      fans140.forEach(([id]) => invalid.add(id));
      addIssue(
        `bank-140-count-${bank}`,
        "error",
        `The ${bank} bank supports at most two 140 mm fans; its 140 mm fans are omitted from the estimate.`,
      );
    }
    for (const [id] of fans140) {
      if (!ids.slice(0, 2).includes(id)) {
        invalid.add(id);
        addIssue(
          `bank-140-position-${id}`,
          "error",
          `${id} is outside the first two positions available to a 140 mm fan in the ${bank} bank.`,
        );
      }
    }
  }

  let intakeCfm = 0;
  let exhaustCfm = 0;
  let gpuAssist = 0;
  let cpuAssist = 0;
  let activeFans = 0;
  for (const [id, value] of installed) {
    if (invalid.has(id)) continue;
    const cfm = cfmForFan(value);
    if (cfm <= 0) continue;
    activeFans += 1;
    if (value.direction === "intake") intakeCfm += cfm;
    else exhaustCfm += cfm;
    const zone = zoneFor(id);
    if (value.direction === "intake" && (zone === "bottom" || zone === "side"))
      gpuAssist += cfm;
    if (value.direction === "exhaust" && (zone === "top" || zone === "rear"))
      cpuAssist += cfm;
  }

  const restriction = Math.max(0, Math.min(config.restriction, 0.9));
  intakeCfm *= 1 - restriction;
  exhaustCfm *= 1 - restriction;
  const throughput =
    Math.min(intakeCfm, exhaustCfm) + Math.abs(intakeCfm - exhaustCfm) * 0.25;
  const effectiveCfm = Math.max(0, throughput);
  const balance = intakeCfm - exhaustCfm;
  const pressure: Evaluation["pressure"] =
    Math.abs(balance) <= 5 ? "Balanced" : balance > 0 ? "Positive" : "Negative";
  const heat =
    Math.max(0, config.cpuPower) +
    (config.gpuInstalled ? Math.max(0, config.gpuPower) : 0);
  const airRise =
    heat === 0
      ? 0
      : heat /
        (PASSIVE_CHASSIS_CONDUCTANCE +
          effectiveCfm * AIR_HEAT_CAPACITY_PER_CFM);
  const localCooling = componentCooling(config);
  const cpuCooling = Math.max(12, localCooling.cpuCfm + effectiveCfm * 0.34 + cpuAssist * 0.22);
  const gpuCooling = Math.max(12, localCooling.gpuCfm + effectiveCfm * 0.3 + gpuAssist * 0.42);
  const cpuTemp =
    config.ambient +
    airRise +
    Math.max(0, config.cpuPower) *
      Math.max(0.05, config.coolerResistance) *
      (1 - Math.min(0.55, cpuCooling / 220));
  const gpuTemp = config.gpuInstalled
    ? config.ambient +
      airRise +
      Math.max(0, config.gpuPower) *
        Math.max(0.05, config.gpuResistance) *
        (1 - Math.min(0.55, gpuCooling / 220))
    : config.ambient;

  if (config.cpuPower > 0 && cpuTemp > 95)
    addIssue(
      "cpu-thermal-limit",
      "warning",
      "Estimated CPU temperature exceeds 95°C. Throttling and protection behaviour are not modeled.",
    );
  if (config.gpuInstalled && config.gpuPower > 0 && gpuTemp > 105)
    addIssue(
      "gpu-thermal-limit",
      "warning",
      "Estimated GPU temperature exceeds 105°C. Throttling and protection behaviour are not modeled.",
    );

  return {
    intakeCfm: Math.round(intakeCfm * 10) / 10,
    exhaustCfm: Math.round(exhaustCfm * 10) / 10,
    effectiveCfm: Math.round(effectiveCfm * 10) / 10,
    pressure,
    airRise: Math.round(airRise * 10) / 10,
    cpuTemp: Math.round(cpuTemp * 10) / 10,
    gpuTemp: Math.round(gpuTemp * 10) / 10,
    issues,
    activeFans,
    invalidFanIds: [...invalid],
  };
}
