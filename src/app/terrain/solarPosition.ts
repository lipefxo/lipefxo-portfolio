export type SolarSettings = {
  date: string;
  /** Local minutes after midnight, fixed Brasília UTC−3 (no browser timezone). */
  timeMinutes: number;
  /** Clockwise rotation of north from world −Z towards +X. */
  northRotationDeg: number;
};

export const DEFAULT_SOLAR_SETTINGS: SolarSettings = {
  date: "2026-09-09",
  timeMinutes: 960,
  northRotationDeg: 90,
};

export const SITE_COORDINATES = { latitude: -15.594963, longitude: -47.772479 };
const TIMEZONE_HOURS = -3;
const RAD = Math.PI / 180;
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

/** Meeus equations as documented by NOAA GML:
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 * https://gml.noaa.gov/grad/solcalc/main.js
 * Returns declination in radians and equation of time in minutes.
 */
function solarCoordinates(timestamp: number) {
  const t = (timestamp / 86400000 + 2440587.5 - 2451545) / 36525;
  const meanLongitude = normalize(280.46646 + t * (36000.76983 + t * 0.0003032));
  const anomaly = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * RAD;
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center = Math.sin(anomaly) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(2 * anomaly) * (0.019993 - 0.000101 * t) + Math.sin(3 * anomaly) * 0.000289;
  const omega = (125.04 - 1934.136 * t) * RAD;
  const apparentLongitude = (meanLongitude + center - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  const obliquity = (23 + (26 + seconds / 60) / 60 + 0.00256 * Math.cos(omega)) * RAD;
  const y = Math.tan(obliquity / 2) ** 2;
  const l = meanLongitude * RAD;
  const equationOfTime = 4 / RAD * (y * Math.sin(2 * l) - 2 * eccentricity * Math.sin(anomaly)
    + 4 * eccentricity * y * Math.sin(anomaly) * Math.cos(2 * l)
    - 0.5 * y * y * Math.sin(4 * l) - 1.25 * eccentricity ** 2 * Math.sin(2 * anomaly));
  return { declination: Math.asin(Math.sin(obliquity) * Math.sin(apparentLongitude)), equationOfTime };
}

/** Geometric sun-center elevation; sunrise/set use the standard 90.833° zenith
 * (solar radius + average refraction). Surrounding terrain and weather are not modeled.
 * Invalid/empty dates fall back to the default; minutes are clamped to this local day.
 */
export function getSolarPosition(settings: SolarSettings) {
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(settings.date) ? Date.parse(`${settings.date}T00:00:00Z`) : NaN;
  const valid = Number.isFinite(candidate) && new Date(candidate).toISOString().slice(0, 10) === settings.date
    && Number(settings.date.slice(0, 4)) >= 1900 && Number(settings.date.slice(0, 4)) <= 2100;
  const midnight = (valid ? candidate : Date.parse(`${DEFAULT_SOLAR_SETTINGS.date}T00:00:00Z`)) - TIMEZONE_HOURS * 3600000;
  const minutes = Number.isFinite(settings.timeMinutes) ? Math.max(0, Math.min(1439, settings.timeMinutes)) : DEFAULT_SOLAR_SETTINGS.timeMinutes;
  const rotation = Number.isFinite(settings.northRotationDeg) ? settings.northRotationDeg : DEFAULT_SOLAR_SETTINGS.northRotationDeg;
  const latitude = SITE_COORDINATES.latitude * RAD;
  const { declination, equationOfTime } = solarCoordinates(midnight + minutes * 60000);
  const hourAngle = (minutes + equationOfTime + 4 * SITE_COORDINATES.longitude - 60 * TIMEZONE_HOURS) / 4 - 180;
  const h = hourAngle * RAD;
  const sinElevation = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(h);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) / RAD;
  const azimuth = normalize(Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude)) / RAD + 180);
  const bearing = (azimuth + rotation) * RAD;
  const horizontal = Math.cos(elevation * RAD);

  function horizonTime(setting: boolean): number | null {
    let estimate = setting ? 1080 : 360;
    for (let i = 0; i < 3; i++) {
      const solar = solarCoordinates(midnight + estimate * 60000);
      const cosine = Math.cos(90.833 * RAD) / (Math.cos(latitude) * Math.cos(solar.declination))
        - Math.tan(latitude) * Math.tan(solar.declination);
      if (Math.abs(cosine) > 1) return null;
      const angle = Math.acos(cosine) / RAD;
      estimate = 720 - 4 * SITE_COORDINATES.longitude - solar.equationOfTime + 60 * TIMEZONE_HOURS + (setting ? 4 : -4) * angle;
    }
    return estimate;
  }
  return {
    azimuth,
    elevation,
    direction: { x: horizontal * Math.sin(bearing), y: Math.sin(elevation * RAD), z: -horizontal * Math.cos(bearing) },
    sunriseMinutes: horizonTime(false),
    sunsetMinutes: horizonTime(true),
  };
}
