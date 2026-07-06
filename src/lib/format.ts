import { Units } from "./types";

const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;

/** Format a distance (meters) according to units. */
export function fmtDistance(meters: number, units: Units, digits = 2): string {
  if (units === "imperial") {
    const mi = (meters / 1000) * KM_TO_MI;
    return `${mi.toFixed(digits)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(digits)} km`;
}

export function distanceValue(meters: number, units: Units): number {
  return units === "imperial" ? (meters / 1000) * KM_TO_MI : meters / 1000;
}

export function distanceUnit(units: Units): string {
  return units === "imperial" ? "mi" : "km";
}

/** Format elevation (meters). */
export function fmtElevation(meters: number, units: Units): string {
  if (units === "imperial") return `${Math.round(meters * M_TO_FT)} ft`;
  return `${Math.round(meters)} m`;
}

/** Duration in seconds -> H:MM:SS or M:SS */
export function fmtDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Compact duration like "1h 25m" */
export function fmtDurationCompact(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

/** Pace seconds/km -> "m:ss /km" (or /mi for imperial) */
export function fmtPace(secPerKm: number, units: Units): string {
  if (secPerKm <= 0) return "—";
  const perUnit = units === "imperial" ? secPerKm / KM_TO_MI : secPerKm;
  const m = Math.floor(perUnit / 60);
  const s = Math.round(perUnit % 60);
  return `${m}:${String(s).padStart(2, "0")} /${units === "imperial" ? "mi" : "km"}`;
}

/** Pace seconds/100m -> "m:ss /100m" */
export function fmtPace100(secPer100: number): string {
  if (secPer100 <= 0) return "—";
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 % 60);
  return `${m}:${String(s).padStart(2, "0")} /100m`;
}

export function fmtSpeed(kmh: number, units: Units): string {
  if (units === "imperial") return `${(kmh * KM_TO_MI).toFixed(1)} mph`;
  return `${kmh.toFixed(1)} km/h`;
}

/** Format a record value depending on its kind. */
export function fmtRecordValue(
  kind: "time" | "distance" | "speed" | "power",
  value: number,
  units: Units
): string {
  switch (kind) {
    case "time":
      return fmtDuration(value);
    case "distance":
      return fmtDistance(value, units, 1);
    case "speed":
      return fmtSpeed(value, units);
    case "power":
      return `${Math.round(value)} W`;
  }
}
