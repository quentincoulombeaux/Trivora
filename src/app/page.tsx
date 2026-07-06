"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Target, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, CardHeader, DISC_META, EmptyState, StatTile, cx } from "@/components/ui";
import { MiniBars, DonutChart } from "@/components/charts";
import { SessionModal } from "@/components/SessionModal";
import { GoalModal } from "@/components/GoalModal";
import { fmtDistance, fmtDuration, fmtDurationCompact, fmtRecordValue } from "@/lib/format";
import { computeRecords } from "@/lib/calc";
import { countSessions, disciplineSplit, goalProgress, summary, upcoming, weeklyVolume, SplitPeriod } from "@/lib/selectors";
import { localizeTitle } from "@/lib/titles";
import { Discipline, Goal, Session } from "@/lib/types";

const KM_TO_MI = 0.621371;
const SPLIT_PERIOD_LABEL: Record<"en" | "fr", Record<SplitPeriod, string>> = {
  en: { week: "Week", month: "Month", year: "Year", all: "All" },
  fr: { week: "Sem.", month: "Mois", year: "An", all: "Tout" },
};
const SPLIT_METRIC_LABEL: Record<"en" | "fr", { distance: string; time: string }> = {
  en: { distance: "Distance", time: "Time" },
  fr: { distance: "Distance", time: "Temps" },
};

function greetKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "greeting.morning";
  if (h < 18) return "greeting.afternoon";
  return "greeting.evening";
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const profile = useStore((s) => s.profile);
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const units = profile.units;
  const distUnit = units === "imperial" ? "mi" : "km";
  const [selected, setSelected] = useState<Session | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalEditing, setGoalEditing] = useState<Goal | null>(null);
  const [splitPeriod, setSplitPeriod] = useState<SplitPeriod>("month");
  const [splitMetric, setSplitMetric] = useState<"distance" | "time">("distance");
  const [sessPeriod, setSessPeriod] = useState<SplitPeriod>("all");

  const stats = useMemo(() => summary(sessions), [sessions]);
  const next = useMemo(() => upcoming(sessions), [sessions]);
  const records = useMemo(() => computeRecords(sessions), [sessions]);
  const volume = useMemo(() => {
    const raw = weeklyVolume(sessions, 12);
    return raw.map((p) => ({ ...p, total: units === "imperial" ? +(((p.total as number) * KM_TO_MI).toFixed(1)) : p.total }));
  }, [sessions, units]);

  const recByDisc = (d: Discipline) => records.filter((r) => r.discipline === d);
  const split = useMemo(() => disciplineSplit(sessions, splitPeriod, splitMetric), [sessions, splitPeriod, splitMetric]);
  const splitTotal = split.run + split.bike + split.swim;
  const sessCount = useMemo(() => countSessions(sessions, sessPeriod), [sessions, sessPeriod]);
  const fmtSplit = (v: number) => (splitMetric === "time" ? fmtDurationCompact(v) : fmtDistance(v, units, 0));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t(greetKey())}, {profile.firstName}</h1>
        <p className="text-sm text-muted mt-1">{t("dashboard.subtitle")}</p>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("card.weeklyDistance")} value={fmtDistance(stats.weeklyDistance, units, 0)} sub={`${fmtDurationCompact(stats.weeklyTime)} · ${t("common.thisWeek")}`} />
        <StatTile label={t("card.monthlyDistance")} value={fmtDistance(stats.monthlyDistance, units, 0)} sub={`${fmtDurationCompact(stats.monthlyTime)} · ${t("common.thisMonth")}`} />
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="stat-label">{t("card.totalSessions")}</div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="stat-value">{sessCount}</span>
            <div className="flex shrink-0 rounded-lg border border-border bg-surface p-0.5 text-[11px]">
              {(["week", "month", "year", "all"] as SplitPeriod[]).map((p) => (
                <button key={p} title={SPLIT_PERIOD_LABEL[lang][p]} onClick={() => setSessPeriod(p)} className={cx("rounded-md px-1.5 py-0.5 font-medium transition", sessPeriod === p ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
                  {SPLIT_PERIOD_LABEL[lang][p]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <StatTile label={t("common.load")} value={String(stats.weeklyLoad)} sub={t("common.thisWeek")} accent="rgb(var(--brand))" info={t("load.explain")} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title={t("card.upcoming")} action={<Link href="/calendar" className="text-xs font-medium text-brand hover:underline flex items-center gap-1">{t("nav.calendar")} <ArrowRight size={12} /></Link>} />
            {next.length === 0 ? (
              <EmptyState title={t("card.noUpcoming")} />
            ) : (
              <div className="space-y-3">
                <button onClick={() => setSelected(next[0])} className="block w-full text-left">
                  <NextHighlight discipline={next[0].discipline} title={localizeTitle(next[0], t, DISC_META[next[0].discipline].label[lang])} date={next[0].date} distance={next[0].distance} units={units} lang={lang} />
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  {next.slice(1, 5).map((s) => {
                    const m = DISC_META[s.discipline];
                    return (
                      <button key={s.id} onClick={() => setSelected(s)} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left transition hover:border-border-strong hover:bg-surface">
                        <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{localizeTitle(s, t, m.label[lang])}</div>
                          <div className="text-xs text-faint">{new Date(s.date).toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "short" })}</div>
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted">{fmtDistance(s.distance, units, 0)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card delay={0.05}>
            <CardHeader title={`${t("analytics.volume")} (${distUnit})`} action={<Link href="/analytics" className="text-xs font-medium text-brand hover:underline flex items-center gap-1">{t("nav.analytics")} <ArrowRight size={12} /></Link>} />
            <MiniBars data={volume} lang={lang} unit={distUnit} height={120} />
          </Card>
        </div>

        <Card delay={0.1}>
          <CardHeader title={t("card.split")} />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-[11px]">
              {(["week", "month", "year", "all"] as SplitPeriod[]).map((p) => (
                <button key={p} onClick={() => setSplitPeriod(p)} className={cx("rounded-md px-2 py-1 font-medium transition", splitPeriod === p ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
                  {SPLIT_PERIOD_LABEL[lang][p]}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-[11px]">
              {(["distance", "time"] as const).map((mt) => (
                <button key={mt} onClick={() => setSplitMetric(mt)} className={cx("rounded-md px-2 py-1 font-medium transition", splitMetric === mt ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
                  {SPLIT_METRIC_LABEL[lang][mt]}
                </button>
              ))}
            </div>
          </div>

          {splitTotal === 0 ? (
            <EmptyState title={t("common.noData")} />
          ) : (
            <>
              <DonutChart
                data={(["run", "bike", "swim"] as Discipline[]).map((d) => ({ name: DISC_META[d].label[lang], value: split[d], color: DISC_META[d].color }))}
                formatter={fmtSplit}
                center={
                  <>
                    <span className="text-xl font-semibold tabular-nums">{fmtSplit(splitTotal)}</span>
                    <span className="text-[11px] text-faint">{SPLIT_METRIC_LABEL[lang][splitMetric]}</span>
                  </>
                }
              />
              <div className="mt-4 space-y-2">
                {(["run", "bike", "swim"] as Discipline[]).map((d) => {
                  const m = DISC_META[d];
                  const pct = splitTotal ? Math.round((split[d] / splitTotal) * 100) : 0;
                  return (
                    <div key={d} className="flex items-center gap-2.5 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                      <span className="flex-1 font-medium">{m.label[lang]}</span>
                      <span className="text-muted tabular-nums">{fmtSplit(split[d])}</span>
                      <span className="w-9 text-right text-faint tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {(["run", "bike", "swim"] as Discipline[]).map((d, idx) => {
          const m = DISC_META[d];
          const recs = recByDisc(d);
          return (
            <Card key={d} delay={0.05 * idx}>
              <CardHeader title={`${m.label[lang]} · ${t("card.records")}`} />
              {recs.length === 0 ? <EmptyState title={t("common.noData")} /> : (
                <div className="space-y-2">
                  {recs.map((r) => (
                    <div key={r.key} className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-surface-2">
                      <div className="flex items-center gap-2"><Trophy size={14} style={{ color: m.color }} /><span className="text-sm">{r.labelKey ? t(r.labelKey) : r.label}</span></div>
                      <span className="text-sm font-semibold tabular-nums">{fmtRecordValue(r.kind, r.value, units)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title={t("card.goals")} action={
            <div className="flex items-center gap-2">
              <Link href="/calendar" className="text-xs font-medium text-muted hover:text-fg flex items-center gap-1">{t("nav.calendar")} <ArrowRight size={12} /></Link>
              <button onClick={() => { setGoalEditing(null); setGoalModalOpen(true); }} className="btn-primary text-xs px-2.5 py-1.5"><Plus size={13} /> {t("goal.add")}</button>
            </div>
          } />
          {goals.length === 0 ? <EmptyState title={t("goal.noGoals")} /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((g) => {
                const gp = goalProgress(g, sessions);
                const pct = gp.pct;
                const m = g.discipline ? DISC_META[g.discipline] : null;
                return (
                  <button key={g.id} onClick={() => { setGoalEditing(g); setGoalModalOpen(true); }} className="w-full text-left rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-border-strong hover:bg-surface">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: m ? `${m.color}1a` : "rgb(var(--brand-soft))" }}>
                          <Target size={15} style={{ color: m ? m.color : "rgb(var(--brand))" }} />
                        </div>
                        <span className="text-sm font-medium leading-tight">{g.title}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mb-1.5">
                      <span className="text-2xl font-semibold tabular-nums">{Math.round(pct * 100)}%</span>
                      {g.deadline && <span className="text-xs text-faint">{new Date(g.deadline).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" })}</span>}
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: m ? m.color : "rgb(var(--brand))" }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                    {gp.predictedSec != null && (
                      <div className="mt-2 text-xs text-faint">{t("goal.estimated")} {fmtDuration(gp.predictedSec)}</div>
                    )}
                    {gp.daysLeft != null && gp.daysLeft >= 0 && (
                      <div className="mt-2 text-xs text-faint">{lang === "fr" ? `J-${gp.daysLeft}` : `${gp.daysLeft} days left`}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <SessionModal open={!!selected} onClose={() => setSelected(null)} discipline={selected?.discipline ?? "run"} editing={selected} />
      <GoalModal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} editing={goalEditing} />
    </div>
  );
}

function NextHighlight({ discipline, title, date, distance, units, lang }: { discipline: Discipline; title: string; date: string; distance: number; units: "metric" | "imperial"; lang: "en" | "fr" }) {
  const m = DISC_META[discipline];
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 transition hover:brightness-[1.02]" style={{ background: `linear-gradient(135deg, ${m.color}1f, transparent)` }}>
      <div className="absolute right-4 top-4 chip" style={{ background: `${m.color}26`, color: m.color }}>{m.label[lang]}</div>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: m.color }}>{lang === "fr" ? "Prochaine séance" : "Next session"}</div>
      <div className="mt-1 text-lg font-semibold">{title}</div>
      <div className="mt-0.5 text-sm text-muted">{new Date(date).toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" })}</div>
      <div className="mt-3 text-sm font-medium tabular-nums">{fmtDistance(distance, units, 1)}</div>
    </div>
  );
}
