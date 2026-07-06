import { Discipline, Profile, Session } from "./types";
import { isoDate, startOfWeek, sumBy, trainingLoad } from "./calc";
import { completed, lastNDays, loadModel } from "./selectors";

export type InsightLevel = "danger" | "warning" | "good" | "info";

export interface CoachInsight {
  code: string;
  level: InsightLevel;
  values?: Record<string, string | number>;
}

export interface CoachReport {
  hasData: boolean;
  ctl: number; // fitness (42d)
  atl: number; // fatigue (7d)
  tsb: number; // form / freshness (ctl - atl)
  rampRate: number; // CTL change over the last 7 days (per week)
  weeklyLoad: number;
  prevWeeklyLoad: number;
  loadDeltaPct: number | null;
  monotony: number | null; // Foster training monotony over last 7 days
  insights: CoachInsight[];
}

export function coachReport(sessions: Session[], ref = new Date()): CoachReport {
  const done = completed(sessions);
  const model = loadModel(sessions, 90, ref);
  const last = model[model.length - 1];
  const weekAgo = model[model.length - 8] ?? model[0];

  const ctl = last ? Number(last.ctl) : 0;
  const atl = last ? Number(last.atl) : 0;
  const tsb = last ? Number(last.tsb) : 0;
  const rampRate = +(ctl - (weekAgo ? Number(weekAgo.ctl) : 0)).toFixed(1);

  // Weekly loads (Mon–Sun)
  const wkStart = startOfWeek(ref);
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7);
  const prevStart = new Date(wkStart); prevStart.setDate(prevStart.getDate() - 7);
  const loadBetween = (from: Date, to: Date) =>
    sumBy(done.filter((s) => { const d = new Date(s.date); return d >= from && d < to; }), (s) => trainingLoad(s));
  const weeklyLoad = loadBetween(wkStart, wkEnd);
  const prevWeeklyLoad = loadBetween(prevStart, wkStart);
  const loadDeltaPct = prevWeeklyLoad > 0 ? Math.round(((weeklyLoad - prevWeeklyLoad) / prevWeeklyLoad) * 100) : null;

  // Foster training monotony over last 7 days (mean daily load / std dev)
  const daily: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref); d.setDate(d.getDate() - i);
    const key = isoDate(d);
    daily.push(sumBy(done.filter((s) => s.date === key), (s) => trainingLoad(s)));
  }
  const mean = daily.reduce((a, b) => a + b, 0) / 7;
  const variance = daily.reduce((a, b) => a + (b - mean) ** 2, 0) / 7;
  const sd = Math.sqrt(variance);
  const monotony = mean > 0 && sd > 0 ? +(mean / sd).toFixed(2) : null;

  // enough recent data to analyse?
  const from28 = new Date(ref); from28.setDate(from28.getDate() - 28);
  const recentCount = done.filter((s) => new Date(s.date) >= from28).length;
  const hasData = recentCount >= 3;

  const insights: CoachInsight[] = [];
  if (!hasData) {
    insights.push({ code: "needData", level: "info" });
  } else {
    // Form / freshness (TSB)
    if (tsb < -30) insights.push({ code: "highFatigue", level: "danger", values: { tsb: Math.round(tsb) } });
    else if (tsb < -10) insights.push({ code: "buildingLoad", level: "warning", values: { tsb: Math.round(tsb) } });
    else if (tsb > 25) insights.push({ code: "veryFresh", level: "info", values: { tsb: Math.round(tsb) } });
    else if (tsb > 5) insights.push({ code: "raceReady", level: "good", values: { tsb: Math.round(tsb) } });
    else insights.push({ code: "balanced", level: "good", values: { tsb: Math.round(tsb) } });

    // Ramp rate (CTL change / week)
    if (rampRate > 7) insights.push({ code: "rampHigh", level: "warning", values: { ramp: rampRate } });
    else if (rampRate < -3) insights.push({ code: "rampDown", level: "info", values: { ramp: rampRate } });

    // Weekly load jump
    if (loadDeltaPct != null && loadDeltaPct > 30) insights.push({ code: "loadJump", level: "warning", values: { pct: loadDeltaPct } });

    // Monotony
    if (monotony != null && monotony > 2 && weeklyLoad > 0) insights.push({ code: "monotonyHigh", level: "warning", values: { mono: monotony } });
  }

  return {
    hasData,
    ctl: Math.round(ctl),
    atl: Math.round(atl),
    tsb: Math.round(tsb),
    rampRate,
    weeklyLoad,
    prevWeeklyLoad,
    loadDeltaPct,
    monotony,
    insights,
  };
}


/* ------------------------- Level estimation ------------------------- */

export type Level = "beginner" | "intermediate" | "advanced";

const LEVEL_THRESHOLDS: Record<Discipline, [number, number]> = {
  run: [15, 40],   // km/week
  bike: [60, 150],
  swim: [3, 8],
};

/** Average weekly distance (km) for a discipline over the last 4 weeks. */
export function avgWeeklyKm(sessions: Session[], discipline: Discipline, ref = new Date()): number {
  const done = completed(sessions).filter((s) => s.discipline === discipline);
  const last28 = lastNDays(done, 28, ref);
  return sumBy(last28, (s) => s.distance) / 1000 / 4;
}

export function estimateLevel(sessions: Session[], discipline: Discipline, ref = new Date()): Level {
  const km = avgWeeklyKm(sessions, discipline, ref);
  const [a, b] = LEVEL_THRESHOLDS[discipline];
  return km < a ? "beginner" : km < b ? "intermediate" : "advanced";
}

/* ------------------------- Nutrition ------------------------- */

const MET: Record<Discipline, number> = { run: 9.8, bike: 7.5, swim: 6.0 };

/** Rough energy cost of a session (kcal), MET-based, scaled by intensity. */
export function sessionKcal(s: Session, weightKg: number): number {
  const minutes = s.duration / 60;
  let intensity = 1;
  if (s.rpe) intensity = Math.min(1.4, Math.max(0.7, s.rpe / 5));
  else if (s.avgHr && s.maxHr) intensity = Math.min(1.4, Math.max(0.7, s.avgHr / s.maxHr / 0.7));
  const met = MET[s.discipline] * intensity;
  return (met * 3.5 * weightKg) / 200 * minutes;
}

export interface NutritionPlan {
  hasProfile: boolean;
  bmr: number;
  tdee: number;
  trainingKcal: number; // avg/day from training
  protein: number; // g/day
  carbs: number; // g/day
  fat: number; // g/day
  proteinPerKg: number;
  carbsPerKg: number;
}

export function nutritionPlan(profile: Profile, sessions: Session[], ref = new Date()): NutritionPlan {
  const weight = profile.weight;
  const height = profile.height;
  if (!weight || !height) {
    return { hasProfile: false, bmr: 0, tdee: 0, trainingKcal: 0, protein: 0, carbs: 0, fat: 0, proteinPerKg: 0, carbsPerKg: 0 };
  }
  const age = profile.age ?? 30;
  const sexConst = profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexConst;

  // average daily training energy over the last 14 days
  const done = completed(sessions);
  const last14 = lastNDays(done, 14, ref);
  const trainTotal = sumBy(last14, (s) => sessionKcal(s, weight));
  const trainingKcal = trainTotal / 14;

  const tdee = Math.round(bmr * 1.35 + trainingKcal);
  const protein = Math.round(1.7 * weight);
  const fat = Math.round(1.0 * weight);
  const carbs = Math.max(0, Math.round((tdee - protein * 4 - fat * 9) / 4));

  return {
    hasProfile: true,
    bmr: Math.round(bmr),
    tdee,
    trainingKcal: Math.round(trainingKcal),
    protein,
    carbs,
    fat,
    proteinPerKg: +(protein / weight).toFixed(1),
    carbsPerKg: +(carbs / weight).toFixed(1),
  };
}

/* ------------------------- Workout suggestions ------------------------- */

export interface WorkoutSuggestion {
  discipline: Discipline;
  level: Level;
  code: string; // recovery | easy | technique | tempo | intervals
}

/** One focus session per discipline, based on level and current freshness (TSB). */
export function workoutSuggestions(sessions: Session[], tsb: number, ref = new Date()): WorkoutSuggestion[] {
  const tired = tsb < -10;
  return (["run", "bike", "swim"] as Discipline[]).map((discipline) => {
    const level = estimateLevel(sessions, discipline, ref);
    let code: string;
    if (tired) code = "recovery";
    else if (level === "advanced") code = "intervals";
    else if (level === "intermediate") code = "tempo";
    else code = discipline === "swim" ? "technique" : "easy";
    return { discipline, level, code };
  });
}
