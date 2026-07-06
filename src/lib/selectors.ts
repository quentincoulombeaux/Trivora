import { Discipline, Goal, GoalType, Session } from "./types";
import { isoDate, paceSecPer100m, paceSecPerKm, speedKmh, startOfWeek, sumBy, swolf, trainingLoad } from "./calc";

export function completed(sessions: Session[]): Session[] {
  return sessions.filter((s) => !s.planned);
}

export function inRange(sessions: Session[], from: Date, to: Date): Session[] {
  const f = from.getTime();
  const t = to.getTime();
  return sessions.filter((s) => {
    const d = new Date(s.date).getTime();
    return d >= f && d <= t;
  });
}

export function lastNDays(sessions: Session[], n: number, ref = new Date()): Session[] {
  const from = new Date(ref);
  from.setDate(from.getDate() - n);
  return inRange(sessions, from, ref);
}

export interface SummaryStats {
  weeklyDistance: number;
  monthlyDistance: number;
  weeklyTime: number;
  monthlyTime: number;
  totalSessions: number;
  weeklyLoad: number;
  split: Record<Discipline, number>;
}

export function summary(sessions: Session[], ref = new Date()): SummaryStats {
  const done = completed(sessions);
  const wkStart = startOfWeek(ref);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const week = done.filter((s) => new Date(s.date) >= wkStart);
  const month = done.filter((s) => new Date(s.date) >= monthStart);
  const split: Record<Discipline, number> = { run: 0, bike: 0, swim: 0 };
  for (const s of done) split[s.discipline] += s.distance;
  return {
    weeklyDistance: sumBy(week, (s) => s.distance),
    monthlyDistance: sumBy(month, (s) => s.distance),
    weeklyTime: sumBy(week, (s) => s.duration),
    monthlyTime: sumBy(month, (s) => s.duration),
    totalSessions: done.length,
    weeklyLoad: sumBy(week, (s) => trainingLoad(s)),
    split,
  };
}

export function upcoming(sessions: Session[], ref = new Date()): Session[] {
  const today = isoDate(ref);
  return sessions
    .filter((s) => s.planned && s.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* ---------- time-series for charts (raw ISO dates; formatting happens in components) ---------- */

function weekKey(d: Date): string {
  return isoDate(startOfWeek(d));
}
function weekEndIso(startIso: string): string {
  const d = new Date(startIso);
  d.setDate(d.getDate() + 6);
  return isoDate(d);
}

export interface SeriesPoint {
  /** week start (weekly series) or session/day date, ISO */
  date: string;
  /** week end ISO, present on weekly series */
  weekEnd?: string;
  [k: string]: number | string | undefined;
}

/** Weekly volume (km) per discipline + load, last `weeks` weeks. */
export function weeklyVolume(sessions: Session[], weeks = 16, ref = new Date()): SeriesPoint[] {
  const done = completed(sessions);
  const map = new Map<string, { run: number; bike: number; swim: number; load: number; count: number }>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i * 7);
    map.set(weekKey(d), { run: 0, bike: 0, swim: 0, load: 0, count: 0 });
  }
  for (const s of done) {
    const k = weekKey(new Date(s.date));
    const e = map.get(k);
    if (!e) continue;
    e[s.discipline] += s.distance / 1000;
    e.load += trainingLoad(s);
    e.count += 1;
  }
  return [...map.entries()].map(([date, v]) => ({
    date,
    weekEnd: weekEndIso(date),
    run: +v.run.toFixed(1),
    bike: +v.bike.toFixed(1),
    swim: +v.swim.toFixed(1),
    total: +(v.run + v.bike + v.swim).toFixed(1),
    load: Math.round(v.load),
    count: v.count,
  }));
}

/** Weekly km + session count for a single discipline. */
export function weeklyDisciplineSeries(
  sessions: Session[],
  discipline: Discipline,
  weeks = 16,
  ref = new Date()
): SeriesPoint[] {
  const done = completed(sessions).filter((s) => s.discipline === discipline);
  const map = new Map<string, { km: number; count: number }>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i * 7);
    map.set(weekKey(d), { km: 0, count: 0 });
  }
  for (const s of done) {
    const e = map.get(weekKey(new Date(s.date)));
    if (!e) continue;
    e.km += s.distance / 1000;
    e.count += 1;
  }
  return [...map.entries()].map(([date, v]) => ({
    date,
    weekEnd: weekEndIso(date),
    km: +v.km.toFixed(1),
    count: v.count,
  }));
}

/** CTL (42d) / ATL (7d) fitness-fatigue model from daily load. */
export function loadModel(sessions: Session[], days = 120, ref = new Date()): SeriesPoint[] {
  const done = completed(sessions);
  const daily = new Map<string, number>();
  for (const s of done) daily.set(s.date, (daily.get(s.date) || 0) + trainingLoad(s));
  const out: SeriesPoint[] = [];
  let ctl = 0;
  let atl = 0;
  const start = new Date(ref);
  start.setDate(start.getDate() - days);
  for (let i = 0; i <= days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = isoDate(d);
    const load = daily.get(key) || 0;
    ctl = ctl + (load - ctl) / 42;
    atl = atl + (load - atl) / 7;
    out.push({ date: key, ctl: +ctl.toFixed(1), atl: +atl.toFixed(1), tsb: +(ctl - atl).toFixed(1) });
  }
  return out;
}

/** Per-session metric trend for a discipline. */
export function metricTrend(
  sessions: Session[],
  discipline: Discipline,
  metric: "pace" | "speed" | "power" | "hr" | "swolf" | "cadence" | "distance"
): SeriesPoint[] {
  return completed(sessions)
    .filter((s) => s.discipline === discipline)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => {
      let value: number | null = null;
      switch (metric) {
        case "pace":
          value = discipline === "swim" ? paceSecPer100m(s.distance, s.duration) : paceSecPerKm(s.distance, s.duration);
          break;
        case "speed": value = speedKmh(s.distance, s.duration); break;
        case "power": value = s.power ?? null; break;
        case "hr": value = s.avgHr ?? null; break;
        case "cadence": value = s.cadence ?? null; break;
        case "swolf": value = swolf(s); break;
        case "distance": value = s.distance / 1000; break;
      }
      return { date: s.date, value: value == null ? 0 : +value.toFixed(2) } as SeriesPoint;
    })
    .filter((p) => (p.value as number) > 0);
}

export type SplitPeriod = "week" | "month" | "year" | "all";

/** Discipline split by period and metric (distance in meters or time in seconds). */
export function disciplineSplit(
  sessions: Session[],
  period: SplitPeriod,
  metric: "distance" | "time",
  ref = new Date()
): Record<Discipline, number> {
  const done = completed(sessions);
  let from: Date | null = null;
  if (period === "week") from = startOfWeek(ref);
  else if (period === "month") from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  else if (period === "year") from = new Date(ref.getFullYear(), 0, 1);
  const out: Record<Discipline, number> = { run: 0, bike: 0, swim: 0 };
  for (const s of done) {
    if (from && new Date(s.date) < from) continue;
    out[s.discipline] += metric === "time" ? s.duration : s.distance;
  }
  return out;
}

/** Count completed sessions within a period (week starts Monday). */
export function countSessions(sessions: Session[], period: SplitPeriod, ref = new Date()): number {
  const done = completed(sessions);
  let from: Date | null = null;
  if (period === "week") from = startOfWeek(ref);
  else if (period === "month") from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  else if (period === "year") from = new Date(ref.getFullYear(), 0, 1);
  return done.filter((s) => !from || new Date(s.date) >= from).length;
}

/** Reference race distances (meters) for time-based goals. */
const RACE_DISTANCE: Partial<Record<GoalType, number>> = {
  marathon: 42195,
  "half-marathon": 21097.5,
};

/**
 * Predict the athlete's current achievable time for a target distance using
 * Riegel's formula T2 = T1 * (D2/D1)^1.06, from their best recent effort.
 */
function predictRaceTime(done: Session[], discipline: Discipline, targetDist: number, ref: Date): number | undefined {
  const recent = lastNDays(done, 120, ref).filter(
    (s) => s.discipline === discipline && s.distance >= 3000 && s.duration > 0
  );
  if (!recent.length) return undefined;
  let best = Infinity;
  for (const s of recent) {
    const t2 = s.duration * Math.pow(targetDist / s.distance, 1.06);
    if (t2 < best) best = t2;
  }
  return best === Infinity ? undefined : Math.round(best);
}

export interface GoalProgress {
  pct: number;
  /** predicted achievable time (s) for time goals */
  predictedSec?: number;
  /** days remaining until the deadline, for dated event goals */
  daysLeft?: number;
}

export function goalProgress(goal: Goal, sessions: Session[], ref = new Date()): GoalProgress {
  const done = completed(sessions);

  // Distance — monthly target (current calendar month)
  if (goal.metric === "distance" && goal.type === "monthly-distance") {
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const dist = sumBy(
      done.filter((s) => new Date(s.date) >= monthStart && (!goal.discipline || s.discipline === goal.discipline)),
      (s) => s.distance
    );
    return { pct: Math.min(1, dist / goal.target) };
  }

  // Distance — weekly volume (current week, Mon–Sun)
  if (goal.metric === "distance" && goal.type === "weekly-volume") {
    const wkStart = startOfWeek(ref);
    const dist = sumBy(
      done.filter((s) => new Date(s.date) >= wkStart && (!goal.discipline || s.discipline === goal.discipline)),
      (s) => s.distance
    );
    return { pct: Math.min(1, dist / goal.target) };
  }

  // Distance — generic accumulation
  if (goal.metric === "distance") {
    const dist = sumBy(done.filter((s) => !goal.discipline || s.discipline === goal.discipline), (s) => s.distance);
    return { pct: Math.min(1, dist / goal.target) };
  }

  // Time — race-time prediction (Riegel) vs target time
  if (goal.metric === "time") {
    const dist = RACE_DISTANCE[goal.type];
    const disc = goal.discipline ?? "run";
    if (dist) {
      const predicted = predictRaceTime(done, disc, dist, ref);
      if (predicted) {
        // 100% when predicted time is at or below the target; scales by goal/predicted otherwise
        return { pct: Math.min(1, goal.target / predicted), predictedSec: predicted };
      }
    }
    return { pct: 0 };
  }

  // Event / count goal — preparation countdown toward the deadline
  if (goal.deadline) {
    const start = new Date(goal.createdAt).getTime();
    const end = new Date(goal.deadline).getTime();
    const now = ref.getTime();
    const total = end - start;
    const pct = total > 0 ? Math.min(1, Math.max(0, (now - start) / total)) : 0;
    const daysLeft = Math.ceil((end - now) / 86400000);
    return { pct, daysLeft };
  }

  // Event without a date — training-consistency proxy
  const recent = lastNDays(done, 90, ref);
  return { pct: Math.min(0.9, recent.length / 80) };
}
