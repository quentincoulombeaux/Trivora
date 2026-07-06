import { Discipline, PersonalRecord, Session } from "./types";

/** Pace in seconds per kilometer */
export function paceSecPerKm(distanceM: number, durationS: number): number {
  if (distanceM <= 0) return 0;
  return durationS / (distanceM / 1000);
}

/** Pace in seconds per 100m (swimming) */
export function paceSecPer100m(distanceM: number, durationS: number): number {
  if (distanceM <= 0) return 0;
  return durationS / (distanceM / 100);
}

/** Average speed in km/h */
export function speedKmh(distanceM: number, durationS: number): number {
  if (durationS <= 0) return 0;
  return distanceM / 1000 / (durationS / 3600);
}

/**
 * SWOLF = time for a pool length (s) + strokes for that length.
 * We approximate strokes from cadence if absent. Lower is better.
 */
export function swolf(session: Session): number | null {
  if (session.discipline !== "swim" || !session.poolLength || session.distance <= 0) return null;
  const lengths = session.distance / session.poolLength;
  if (lengths <= 0) return null;
  const timePerLength = session.duration / lengths;
  // estimate strokes per length: cadence (strokes/min) * timePerLength/60, fallback heuristic
  const strokesPerLength = session.cadence
    ? (session.cadence * timePerLength) / 60
    : session.poolLength * 0.6; // ~0.6 strokes per meter as a rough estimate
  return Math.round(timePerLength + strokesPerLength);
}

/**
 * Training load (TRIMP-like, simplified). Uses RPE when available,
 * otherwise estimates intensity from heart rate or a discipline default.
 * Returns an arbitrary-unit score scaled roughly to TSS magnitude.
 */
export function trainingLoad(session: Session): number {
  const minutes = session.duration / 60;
  let intensity: number;
  if (session.rpe) {
    intensity = session.rpe / 10; // 0.1 - 1.0
  } else if (session.avgHr && session.maxHr) {
    intensity = Math.min(1, Math.max(0.4, session.avgHr / session.maxHr));
  } else if (session.avgHr) {
    intensity = Math.min(1, Math.max(0.4, session.avgHr / 190));
  } else {
    intensity = 0.6;
  }
  // session-RPE style load, scaled
  return Math.round(minutes * intensity * 10);
}

export const RECORD_DISTANCES = {
  run: [
    { key: "run-5k", label: "5 km", labelKey: "record.5k", meters: 5000 },
    { key: "run-10k", label: "10 km", labelKey: "record.10k", meters: 10000 },
    { key: "run-half", label: "Half marathon", labelKey: "record.half", meters: 21097.5 },
    { key: "run-marathon", label: "Marathon", labelKey: "record.marathon", meters: 42195 },
  ],
  swim: [
    { key: "swim-100", label: "100 m", labelKey: "record.swim100", meters: 100 },
    { key: "swim-400", label: "400 m", labelKey: "record.swim400", meters: 400 },
    { key: "swim-1500", label: "1500 m", labelKey: "record.swim1500", meters: 1500 },
  ],
};

/**
 * Compute personal records from sessions.
 * For running/swimming: best time at >= a benchmark distance (extrapolated to the exact distance).
 * For cycling: longest ride, best avg speed, best power.
 */
export function computeRecords(sessions: Session[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const completed = sessions.filter((s) => !s.planned);

  // Run + swim distance time PRs
  for (const disc of ["run", "swim"] as const) {
    for (const d of RECORD_DISTANCES[disc]) {
      let best: { value: number; id: string; date: string } | null = null;
      for (const s of completed) {
        if (s.discipline !== disc) continue;
        if (s.distance >= d.meters && s.distance > 0) {
          // extrapolate the time to the exact benchmark distance (proportional)
          const t = s.duration * (d.meters / s.distance);
          if (!best || t < best.value) best = { value: t, id: s.id, date: s.date };
        }
      }
      if (best) {
        records.push({
          key: d.key,
          label: d.label,
          labelKey: d.labelKey,
          discipline: disc,
          value: best.value,
          kind: "time",
          sessionId: best.id,
          date: best.date,
        });
      }
    }
  }

  // Bike records
  const rides = completed.filter((s) => s.discipline === "bike");
  if (rides.length) {
    const longest = rides.reduce((a, b) => (b.distance > a.distance ? b : a));
    records.push({
      key: "bike-longest",
      label: "Longest ride",
      labelKey: "record.longest",
      discipline: "bike",
      value: longest.distance,
      kind: "distance",
      sessionId: longest.id,
      date: longest.date,
    });
    const fastest = rides.reduce((a, b) =>
      speedKmh(b.distance, b.duration) > speedKmh(a.distance, a.duration) ? b : a
    );
    records.push({
      key: "bike-speed",
      label: "Best avg speed",
      labelKey: "record.speed",
      discipline: "bike",
      value: speedKmh(fastest.distance, fastest.duration),
      kind: "speed",
      sessionId: fastest.id,
      date: fastest.date,
    });
    const powered = rides.filter((r) => r.power);
    if (powered.length) {
      const bestPower = powered.reduce((a, b) => ((b.power || 0) > (a.power || 0) ? b : a));
      records.push({
        key: "bike-power",
        label: "Best power",
        labelKey: "record.power",
        discipline: "bike",
        value: bestPower.power || 0,
        kind: "power",
        sessionId: bestPower.id,
        date: bestPower.date,
      });
    }
  }

  return records;
}

/** Is this session a new record vs the rest? Returns matched record keys. */
export function recordsForSession(session: Session, allSessions: Session[]): PersonalRecord[] {
  const recs = computeRecords(allSessions);
  return recs.filter((r) => r.sessionId === session.id);
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function sumBy<T>(arr: T[], fn: (t: T) => number): number {
  return arr.reduce((acc, x) => acc + fn(x), 0);
}

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function disciplineColor(d: Discipline): string {
  return d === "run" ? "var(--run)" : d === "bike" ? "var(--bike)" : "var(--swim)";
}
