import { Goal, Profile, Session } from "./types";

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Deterministic-ish sample data: ~6 months of training ending "today".
 * Titles carry a titleKey so they localize (EN/FR) at render time.
 */
export function buildSampleSessions(today = new Date()): Session[] {
  const sessions: Session[] = [];
  const DAYS = 168; // 24 weeks
  let rnd = 1337;
  const rand = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };

  for (let i = DAYS; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dow = (date.getDay() + 6) % 7; // Mon=0

    const plan: { disc: Session["discipline"] }[] = [];
    if (dow === 0 || dow === 2) plan.push({ disc: "run" });
    if (dow === 5) plan.push({ disc: "run" }); // long run Sat
    if (dow === 1) plan.push({ disc: "bike" });
    if (dow === 6) plan.push({ disc: "bike" }); // long ride Sun
    if (dow === 3) plan.push({ disc: "swim" });

    const week = Math.floor((DAYS - i) / 7);
    const deload = week % 4 === 3;

    for (const p of plan) {
      if (deload && rand() < 0.5) continue;
      const progress = (DAYS - i) / DAYS;
      if (p.disc === "run") {
        const long = dow === 5;
        const distance = long
          ? 14000 + progress * 14000 + rand() * 3000
          : 7000 + progress * 4000 + rand() * 2500;
        const basePace = (long ? 320 : 300) - progress * 25 + (rand() * 20 - 10);
        sessions.push({
          id: uid(),
          discipline: "run",
          date: iso(date),
          title: long ? "Long run" : "Easy run",
          titleKey: long ? "title.run.long" : "title.run.easy",
          distance: Math.round(distance),
          duration: Math.round((distance / 1000) * basePace),
          elevation: Math.round(rand() * (long ? 320 : 120)),
          avgHr: Math.round(148 + rand() * 18),
          maxHr: Math.round(172 + rand() * 14),
          rpe: long ? 7 : 4,
          createdAt: iso(date),
        });
      } else if (p.disc === "bike") {
        const long = dow === 6;
        const distance = long
          ? 55000 + progress * 35000 + rand() * 12000
          : 28000 + progress * 12000 + rand() * 8000;
        const speed = (long ? 28 : 30) + progress * 4 + (rand() * 3 - 1.5);
        sessions.push({
          id: uid(),
          discipline: "bike",
          date: iso(date),
          title: long ? "Endurance ride" : "Tempo ride",
          titleKey: long ? "title.bike.endurance" : "title.bike.tempo",
          distance: Math.round(distance),
          duration: Math.round((distance / 1000 / speed) * 3600),
          elevation: Math.round(rand() * (long ? 900 : 300)),
          power: Math.round(180 + progress * 60 + rand() * 40),
          cadence: Math.round(82 + rand() * 12),
          avgHr: Math.round(138 + rand() * 16),
          maxHr: Math.round(168 + rand() * 12),
          rpe: long ? 6 : 5,
          createdAt: iso(date),
        });
      } else {
        const distance = 1500 + Math.round(rand() * 4) * 250 + progress * 800;
        const pace100 = 130 - progress * 12 + (rand() * 10 - 5);
        sessions.push({
          id: uid(),
          discipline: "swim",
          date: iso(date),
          title: "Swim set",
          titleKey: "title.swim.set",
          distance: Math.round(distance),
          duration: Math.round((distance / 100) * pace100),
          poolLength: 25,
          strokeType: "freestyle",
          cadence: Math.round(28 + rand() * 8),
          avgHr: Math.round(132 + rand() * 14),
          rpe: 5,
          createdAt: iso(date),
        });
      }
    }
  }

  // Planned (future) sessions
  for (let i = 1; i <= 6; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dow = (date.getDay() + 6) % 7;
    if (dow === 0)
      sessions.push({
        id: uid(), discipline: "run", date: iso(date),
        title: "Intervals 6x800m", titleKey: "title.run.intervals",
        distance: 9000, duration: 2700, elevation: 40, rpe: 8, planned: true, createdAt: iso(today),
      });
    if (dow === 6)
      sessions.push({
        id: uid(), discipline: "bike", date: iso(date),
        title: "Long ride 90km", titleKey: "title.bike.long",
        distance: 90000, duration: 11700, elevation: 1100, rpe: 7, planned: true, createdAt: iso(today),
      });
    if (dow === 3)
      sessions.push({
        id: uid(), discipline: "swim", date: iso(date),
        title: "Technique 2000m", titleKey: "title.swim.technique",
        distance: 2000, duration: 2600, poolLength: 25, strokeType: "freestyle", planned: true, createdAt: iso(today),
      });
  }

  return sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const defaultProfile: Profile = {
  firstName: "Thomas",
  lastName: "Durand",
  language: "fr",
  units: "metric",
  theme: "system",
  weight: 72,
  height: 178,
  age: 30,
  sex: "male",
};

export function buildSampleGoals(today = new Date()): Goal[] {
  const d = (days: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + days);
    return iso(x);
  };
  return [
    { id: "g1", type: "marathon", title: "Sub-3:30 Marathon", discipline: "run", target: 3 * 3600 + 30 * 60, metric: "time", deadline: d(120), createdAt: iso(today) },
    { id: "g2", type: "half-ironman", title: "Finish Half Ironman", target: 1, metric: "count", deadline: d(200), createdAt: iso(today) },
    { id: "g3", type: "monthly-distance", title: "200 km / month running", discipline: "run", target: 200000, metric: "distance", createdAt: iso(today) },
  ];
}
