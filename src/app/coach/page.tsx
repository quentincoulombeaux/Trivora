"use client";

import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Flame, Info, Sparkles, Utensils } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, CardHeader, DISC_META, EmptyState, SectionTitle, StatTile } from "@/components/ui";
import { coachReport, InsightLevel, nutritionPlan, workoutSuggestions } from "@/lib/coach";
import type { LucideIcon } from "lucide-react";

function fill(str: string, values?: Record<string, string | number>): string {
  if (!values) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (values[k] != null ? String(values[k]) : `{${k}}`));
}

const LEVEL_STYLE: Record<InsightLevel, { color: string; Icon: LucideIcon }> = {
  danger: { color: "#ef4444", Icon: AlertTriangle },
  warning: { color: "#f59e0b", Icon: AlertCircle },
  good: { color: "rgb(var(--bike))", Icon: CheckCircle2 },
  info: { color: "rgb(var(--brand))", Icon: Info },
};

const TYPE_LABEL: Record<string, string> = {
  recovery: "block.recovery",
  easy: "block.endurance",
  technique: "block.technique",
  tempo: "block.tempo",
  intervals: "block.interval",
};

export default function Coach() {
  const { t, lang } = useI18n();
  const sessions = useStore((s) => s.sessions);
  const profile = useStore((s) => s.profile);

  const report = useMemo(() => coachReport(sessions), [sessions]);
  const nutrition = useMemo(() => nutritionPlan(profile, sessions), [profile, sessions]);
  const workouts = useMemo(() => workoutSuggestions(sessions, report.tsb), [sessions, report.tsb]);

  const tsbColor =
    report.tsb < -10 ? "#ef4444"
    : report.tsb > 25 ? "rgb(var(--brand))"
    : report.tsb > 5 ? "rgb(var(--bike))"
    : "rgb(var(--fg))";
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div>
      <SectionTitle
        title={t("nav.coach")}
        subtitle={fill(t("coach.hello"), { name: profile.firstName })}
        action={<span className="chip bg-brand-soft text-brand"><Sparkles size={12} /> {t("coach.autoBadge")}</span>}
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <StatTile label={t("coach.fitness")} value={String(report.ctl)} info={t("coach.fitnessExplain")} />
        <StatTile label={t("coach.fatigue")} value={String(report.atl)} info={t("coach.fatigueExplain")} />
        <StatTile label={t("coach.form")} value={signed(report.tsb)} accent={tsbColor} info={t("coach.formExplain")} />
        <StatTile label={t("coach.ramp")} value={signed(report.rampRate)} sub={t("coach.rampUnit")} info={t("coach.rampExplain")} />
      </div>

      {/* Recommendations */}
      <Card className="mb-5">
        <CardHeader title={t("coach.insightsTitle")} />
        <div className="space-y-3">
          {report.insights.map((ins, i) => {
            const { color, Icon } = LEVEL_STYLE[ins.level];
            return (
              <motion.div
                key={ins.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 rounded-xl border border-border bg-surface-2 p-4"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <Icon size={18} className="mt-0.5 shrink-0" style={{ color }} />
                <div>
                  <div className="text-sm font-semibold">{t(`coach.${ins.code}.title`)}</div>
                  <div className="mt-1 text-sm leading-relaxed text-muted">{fill(t(`coach.${ins.code}.advice`), ins.values)}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Nutrition */}
      <Card className="mb-5">
        <CardHeader title={<span className="flex items-center gap-2"><Utensils size={15} className="text-brand" /> {t("coach.nutrition.title")}</span>} />
        {!nutrition.hasProfile ? (
          <EmptyState title={t("coach.nutrition.needProfile")} hint={t("nav.settings")} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="stat-label flex items-center gap-1.5"><Flame size={13} className="text-brand" /> {t("coach.nutrition.calories")}</div>
                <div className="stat-value mt-1.5" style={{ color: "rgb(var(--brand))" }}>{nutrition.tdee.toLocaleString()}</div>
                <div className="text-xs text-faint mt-1">{t("coach.nutrition.maintenance")}</div>
              </div>
              <MacroTile label={t("coach.nutrition.protein")} value={`${nutrition.protein} g`} color="#6366f1" />
              <MacroTile label={t("coach.nutrition.carbs")} value={`${nutrition.carbs} g`} color="#0ea5e9" />
              <MacroTile label={t("coach.nutrition.fat")} value={`${nutrition.fat} g`} color="#f59e0b" />
            </div>

            <p className="mt-4 text-xs text-muted">{fill(t("coach.nutrition.bmrNote"), { bmr: nutrition.bmr, train: nutrition.trainingKcal })}</p>
            <p className="mt-1 text-xs text-muted">{fill(t("coach.nutrition.macroNote"), { ppk: nutrition.proteinPerKg, cpk: nutrition.carbsPerKg })}</p>

            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">{t("coach.nutrition.tipsTitle")}</div>
              <div className="space-y-2">
                {["tip1", "tip2", "tip3", "tip4"].map((k) => (
                  <div key={k} className="flex gap-2.5 text-sm text-muted">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-bike" />
                    <span className="leading-relaxed">{t(`coach.nutrition.${k}`)}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-faint">{t("coach.nutrition.disclaimer")}</p>
          </>
        )}
      </Card>

      {/* Recommended sessions */}
      <Card>
        <CardHeader title={t("coach.sessions.title")} />
        <p className="text-sm text-muted -mt-2 mb-4">{t("coach.sessions.subtitle")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {workouts.map((w) => {
            const m = DISC_META[w.discipline];
            return (
              <div key={w.discipline} className="rounded-2xl border border-border bg-surface-2 p-4" style={{ borderTop: `3px solid ${m.color}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: m.color }}>{m.label[lang]}</span>
                  <span className="chip bg-surface text-muted text-[10px]">{t(`coach.level.${w.level}`)}</span>
                </div>
                <div className="text-sm font-medium">{t(TYPE_LABEL[w.code])}</div>
                <div className="mt-1.5 text-sm leading-relaxed text-muted">{t(`coach.workout.${w.discipline}.${w.code}`)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="stat-label flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}</div>
      <div className="stat-value mt-1.5">{value}</div>
    </div>
  );
}

