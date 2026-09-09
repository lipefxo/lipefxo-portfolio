import * as THREE from "three";

export type PlanPoint = { id: string; px: number; py: number; x: number; z: number };

const SCALE = 5.8;
const ORIGIN = { x: 316, y: 647 };

/** Converts the scanned survey-plan coordinates to local metres. */
export function planPoint(id: string, px: number, py: number): PlanPoint {
  return { id, px, py, x: (px - ORIGIN.x) / SCALE, z: (py - ORIGIN.y) / SCALE };
}

export const PARCEL: readonly PlanPoint[] = [
  planPoint("M00", 146, 331),
  planPoint("L92", 374, 358),
  planPoint("L91", 487, 963),
  planPoint("M147", 263, 945),
  planPoint("M147A", 255, 903),
];

export const LOT: readonly PlanPoint[] = [
  PARCEL[0],
  planPoint("M99", 1308, 469),
  planPoint("M148", 1443, 1034),
  PARCEL[3],
];

export const PARCEL_AREA_SQM = 4011;
export const DIMENSIONS = [
  { text: "39.68 m", from: PARCEL[0], to: PARCEL[1] },
  { text: "105.73 m", from: PARCEL[1], to: PARCEL[2] },
  { text: "38.61 m", from: PARCEL[2], to: PARCEL[3] },
  { text: "7.45 m", from: PARCEL[3], to: PARCEL[4] },
  { text: "100.23 m", from: PARCEL[4], to: PARCEL[0] },
] as const;

export const ROADS = [
  { name: 'VICINAL "N"', from: planPoint("road-nw", 146, 275), to: planPoint("road-ne", 1510, 430) },
  { name: 'VICINAL "H"', from: planPoint("road-h1", 1335, 295), to: planPoint("road-h2", 1510, 1045) },
] as const;

export function pointVector(point: PlanPoint, height = 0): THREE.Vector3 {
  return new THREE.Vector3(point.x, height, point.z);
}

export function centroid(points: readonly PlanPoint[]): THREE.Vector3 {
  const center = points.reduce((sum, point) => sum.add(pointVector(point)), new THREE.Vector3());
  return center.multiplyScalar(1 / points.length);
}
