"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trophy, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Discipline, Session } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, CardHeader, DISC_META, EmptyState, SectionTitle, StatTile, cx } from "./ui";
import { SessionModal } from "./SessionModal";
import { WeeklyBars } from "./charts";
import {
  fmtDistance, fmtDuration, fmtDurationCompact, fmtPace, fmtPace100, fmtRecordValue, fmtSpeed,
} from "@/lib/format";
import {
  computeRecords, paceSecPer100m, paceSecPerKm, speedKmh, startOfWeek, sumBy, swolf, trainingLoad,
} from "@/lib/calc";
import { weeklyDisciplineSeries, SeriesPoint } from "@/lib/selectors";
import { localizeTitle } from "@/lib/titles";

const KM_TO_MI = 0.621371;
type Period = "week" | "month" | "year";
const PERIOD_SHORT: Record<"en" | "fr", Record<Period, string>> = {
  en: { week: "Wk", month: "Mo", year: "Yr" },
  fr: { week: "Sem.", month: "Mois", year: "An" },
};

export function SportPage({ discipline }: { discipline: Discipline }) {
  const { t, lang } = useI18n();
  const units = useStore((s) => s.profile.units);
  const sessions = useStore((s) => s.sessions);
  const deleteSession = useStore((s) => s.deleteSession);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [durPeriod, setDurPeriod] = useState<Period>("week");
  const [sort, setSort] = useState<string>("date");
  const meta = DISC_META[discipline];
  const distUnit = units === "imperial" ? "mi" : "km";

  const list = useMemo(
    () => sessions.filter((s) => s.discipline === discipline && !s.planned).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions, discipline]
  );
  const records = useMemo(() => computeRecords(sessions).filter((r) => r.discipline === discipline), [sessions, discipline]);
  const recordSessionIds = new Set(records.map((r) => r.sessionId));

  const totalDist = sumBy(list, (s) => s.distance);
  const totalTime = sumBy(list, (s) => s.duration);

  // weekly series (convert km -> display unit)
  const weekly = useMemo(() => {
    const raw = weeklyDisciplineSeries(sessions, discipline, 16);
    return raw.map((p): SeriesPoint => ({ ...p, km: units === "imperial" ? +(((p.km as number) * KM_TO_MI).toFixed(1)) : p.km }));
  }, [sessions, discipline, units]);

  // duration for the selected period
  const periodDuration = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (durPeriod === "week") from = startOfWeek(now);
    else if (durPeriod === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
    else from = new Date(now.getFullYear(), 0, 1);
    return sumBy(list.filter((s) => new Date(s.date) >= from), (s) => s.duration);
  }, [list, durPeriod]);

  const sortedList = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      switch (sort) {
        case "distance": return b.distance - a.distance;
        case "duration": return b.duration - a.duration;
        case "load": return trainingLoad(b) - trainingLoad(a);
        case "speed": return speedKmh(b.distance, b.duration) - speedKmh(a.distance, a.duration);
        case "power": return (b.power || 0) - (a.power || 0);
        case "cadence": return (b.cadence || 0) - (a.cadence || 0);
        case "elevation": return (b.elevation || 0) - (a.elevation || 0);
        case "hr": return (b.avgHr || 0) - (a.avgHr || 0);
        case "pace100": return paceSecPer100m(a.distance, a.duration) - paceSecPer100m(b.distance, b.duration);
        case "swolf": return (swolf(a) ?? Infinity) - (swolf(b) ?? Infinity);
        default: return a.date < b.date ? 1 : -1;
      }
    });
    return arr;
  }, [list, sort]);

  const sortOptions: { key: string; label: string }[] = (() => {
    const date = { key: "date", label: t("sort.dateDesc") };
    const distance = { key: "distance", label: t("common.distance") };
    const duration = { key: "duration", label: t("common.duration") };
    const load = { key: "load", label: t("common.load") };
    const hr = { key: "hr", label: t("common.avgHr") };
    const elev = { key: "elevation", label: t("common.elevation") };
    if (discipline === "run")
      return [date, { key: "speed", label: t("common.pace") }, distance, duration, elev, hr, load];
    if (discipline === "bike")
      return [date, { key: "speed", label: t("common.speed") }, { key: "power", label: t("common.power") }, { key: "cadence", label: t("common.cadence") }, distance, duration, elev, load];
    return [date, { key: "pace100", label: "/100m" }, { key: "swolf", label: "SWOLF" }, distance, duration, hr, load];
  })();

  function metricLine(s: Session): string {
    let base: string;
    if (discipline === "run") {
      base = `${fmtPace(paceSecPerKm(s.distance, s.duration), units)} · ${fmtSpeed(speedKmh(s.distance, s.duration), units)}`;
    } else if (discipline === "bike") {
      const parts = [fmtSpeed(speedKmh(s.distance, s.duration), units)];
      if (s.power) parts.push(`${s.power} W`);
      if (s.cadence) parts.push(`${s.cadence} rpm`);
      base = parts.join(" · ");
    } else {
      const sw = swolf(s);
      base = `${fmtPace100(paceSecPer100m(s.distance, s.duration))}${sw ? ` · SWOLF ${sw}` : ""}`;
    }
    return `${base} · ${t("common.loadShort")} ${trainingLoad(s)}`;
  }

  return (
    <div>
      <SectionTitle
        title={meta.label[lang]}
        subtitle={`${list.length} ${t("common.sessions")} · ${fmtDistance(totalDist, units, 0)} · ${fmtDurationCompact(totalTime)}`}
        action={
          <button className="btn text-white shadow-sm hover:opacity-90" style={{ background: meta.color }} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={16} /> {t("common.addSession")}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatTile label={t("common.thisWeek")} value={fmtDistance(weekDist(list), units, 0)} accent={meta.color} />
        <StatTile label={t("common.thisMonth")} value={fmtDistance(monthDist(list), units, 0)} accent={meta.color} />
        {/* Duration tile with period selector (same layout as StatTile for alignment) */}
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="stat-label">{t("common.duration")}</div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="stat-value">{fmtDurationCompact(periodDuration)}</span>
            <div className="flex shrink-0 rounded-lg border border-border bg-surface p-0.5 text-[11px]">
              {(["week", "month", "year"] as Period[]).map((p) => (
                <button key={p} title={t(`common.${p}`)} onClick={() => setDurPeriod(p)} className={cx("rounded-md px-1.5 py-0.5 font-medium transition", durPeriod === p ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
                  {PERIOD_SHORT[lang][p]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <StatTile label={t("common.load")} value={String(Math.round(sumBy(list, (s) => trainingLoad(s))))} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title={`${t("card.weeklyKm")} (${distUnit})`} />
            {weekly.some((w) => (w.km as number) > 0) ? (
              <WeeklyBars data={weekly} dataKey="km" color={meta.color} name={t("card.weeklyKm")} lang={lang} unit={distUnit} />
            ) : <EmptyState title={t("common.noData")} />}
          </Card>

          <Card delay={0.05}>
            <CardHeader title={t("card.weeklySessions")} />
            {weekly.some((w) => (w.count as number) > 0) ? (
              <WeeklyBars data={weekly} dataKey="count" color={meta.color} name={t("card.weeklySessions")} lang={lang} allowDecimals={false} />
            ) : <EmptyState title={t("common.noData")} />}
          </Card>

          <Card delay={0.1}>
            <CardHeader title={`${t("common.sessions")} (${list.length})`} action={
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20">
                {sortOptions.map((o) => (<option key={o.key} value={o.key}>{o.label}</option>))}
              </select>
            } />
            {list.length === 0 ? (
              <EmptyState title={t("common.noData")} hint={t("common.addSession")} />
            ) : (
              <div className="-mx-2 divide-y divide-border">
                {sortedList.slice(0, 30).map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className="group flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-surface-2">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg leading-none" style={{ background: `${meta.color}1a` }}>
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>{dayOf(s.date)}</span>
                      <span className="mt-0.5 text-[9px] font-medium" style={{ color: meta.color }}>{monthOf(s.date, lang)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{localizeTitle(s, t, meta.label[lang])}</span>
                        {recordSessionIds.has(s.id) && <span className="chip bg-amber-400/15 text-amber-500"><Trophy size={11} /> PR</span>}
                      </div>
                      <div className="text-xs text-muted truncate">{metricLine(s)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{fmtDistance(s.distance, units, 1)}</div>
                      <div className="text-xs text-faint tabular-nums">{fmtDuration(s.duration)}</div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                      <button className="btn-ghost p-1.5" onClick={() => { setEditing(s); setOpen(true); }}><Pencil size={14} /></button>
                      <button className="btn-ghost p-1.5 text-red-500" onClick={() => deleteSession(s.id)}><Trash2 size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card delay={0.1}>
            <CardHeader title={t("card.records")} />
            {records.length === 0 ? <EmptyState title={t("common.noData")} /> : (
              <div className="space-y-2.5">
                {records.map((r) => (
                  <div key={r.key} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-3">
                    <div className="flex items-center gap-2.5"><Trophy size={15} style={{ color: meta.color }} /><span className="text-sm font-medium">{r.labelKey ? t(r.labelKey) : r.label}</span></div>
                    <span className="text-sm font-semibold tabular-nums">{fmtRecordValue(r.kind, r.value, units)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <SessionModal open={open} onClose={() => setOpen(false)} discipline={discipline} editing={editing} />
    </div>
  );
}

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10));
}
function monthOf(iso: string, lang: "en" | "fr"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { month: "short" });
}

function weekDist(list: Session[]): number {
  const start = startOfWeek(new Date());
  return sumBy(list.filter((s) => new Date(s.date) >= start), (s) => s.distance);
}
function monthDist(list: Session[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return sumBy(list.filter((s) => new Date(s.date) >= start), (s) => s.distance);
}
