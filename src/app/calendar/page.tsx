"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, DISC_META, SectionTitle, cx } from "@/components/ui";
import { SessionModal } from "@/components/SessionModal";
import { GoalModal } from "@/components/GoalModal";
import { Discipline, Goal, Session } from "@/lib/types";
import { fmtDistance, fmtDurationCompact } from "@/lib/format";
import { isoDate, startOfWeek, sumBy, trainingLoad } from "@/lib/calc";
import { localizeTitle } from "@/lib/titles";

function iso(d: Date) { return isoDate(d); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export default function Calendar() {
  const { t, lang } = useI18n();
  const units = useStore((s) => s.profile.units);
  const sessions = useStore((s) => s.sessions);
  const updateSession = useStore((s) => s.updateSession);
  const goals = useStore((s) => s.goals);

  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [modal, setModal] = useState<{ date: string; disc: Discipline } | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalEditing, setGoalEditing] = useState<Goal | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return map;
  }, [sessions]);

  const goalsByDay = useMemo(() => {
    const map = new Map<string, Goal[]>();
    for (const g of goals) {
      if (!g.deadline) continue;
      const arr = map.get(g.deadline) || [];
      arr.push(g);
      map.set(g.deadline, arr);
    }
    return map;
  }, [goals]);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const todayIso = iso(new Date());
  const weekdayNames = useMemo(() => {
    const base = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(base, i).toLocaleDateString(lang, { weekday: "short" }));
  }, [lang]);

  const title = view === "week"
    ? `${startOfWeek(cursor).toLocaleDateString(lang, { day: "numeric", month: "short" })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" })}`
    : cursor.toLocaleDateString(lang, { month: "long", year: "numeric" });

  function nav(dir: number) {
    setCursor((c) => {
      const x = new Date(c);
      if (view === "week") x.setDate(x.getDate() + dir * 7);
      else x.setMonth(x.getMonth() + dir);
      return x;
    });
  }

  function onDrop(dateStr: string) {
    if (drag) { updateSession(drag, { date: dateStr }); setDrag(null); }
  }

  return (
    <div>
      <SectionTitle title={t("calendar.title")} subtitle={t("calendar.subtitle")} action={
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface p-0.5 text-sm">
            <button onClick={() => setView("week")} className={cx("btn px-3 py-1.5", view === "week" ? "bg-surface-2 text-fg" : "text-muted")}>{t("common.week")}</button>
            <button onClick={() => setView("month")} className={cx("btn px-3 py-1.5", view === "month" ? "bg-surface-2 text-fg" : "text-muted")}>{t("common.month")}</button>
          </div>
          <button className="btn-outline" onClick={() => setCursor(new Date())}>{t("calendar.today")}</button>
        </div>
      } />

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold capitalize">{title}</h3>
          <div className="flex items-center gap-1">
            <button className="btn-ghost p-1.5" onClick={() => nav(-1)}><ChevronLeft size={16} /></button>
            <button className="btn-ghost p-1.5" onClick={() => nav(1)}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-surface-2">
          {weekdayNames.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-faint">{d}</div>
          ))}
        </div>

        <div className={cx("grid grid-cols-7", view === "week" && "min-h-[60vh]")}>
          {days.map((d, i) => {
            const ds = iso(d);
            const inMonth = view === "week" || d.getMonth() === cursor.getMonth();
            const list = byDay.get(ds) || [];
            const isToday = ds === todayIso;
            return (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(ds)}
                className={cx(
                  "group relative border-b border-r border-border p-1.5 min-h-[92px]",
                  view === "week" && "min-h-[60vh]",
                  i % 7 === 6 && "border-r-0",
                  !inMonth && "bg-surface-2/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cx(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday ? "bg-brand text-white font-semibold" : inMonth ? "text-fg" : "text-faint"
                  )}>{d.getDate()}</span>
                  <button
                    onClick={() => setModal({ date: ds, disc: "run" })}
                    className="opacity-0 group-hover:opacity-100 transition btn-ghost p-1"
                  ><Plus size={13} /></button>
                </div>
                {(goalsByDay.get(ds) || []).map((g) => {
                  const gc = g.discipline ? DISC_META[g.discipline].color : "rgb(var(--brand))";
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setGoalEditing(g); setGoalModalOpen(true); }}
                      className="mb-1 flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold"
                      style={{ background: `${gc}26`, color: gc }}
                      title={`${t("goal.completed")}: ${g.title}`}
                    >
                      <Target size={11} className="shrink-0" />
                      <span className="truncate">{g.title}</span>
                    </button>
                  );
                })}
                <div className="space-y-1">
                  {list.slice(0, view === "week" ? 12 : 3).map((s) => {
                    const m = DISC_META[s.discipline];
                    return (
                      <motion.button
                        layout
                        key={s.id}
                        draggable
                        onDragStart={() => setDrag(s.id)}
                        onClick={() => setEditing(s)}
                        className={cx(
                          "w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium cursor-grab active:cursor-grabbing",
                          s.planned && "ring-1 ring-inset"
                        )}
                        style={{ background: `${m.color}1f`, color: m.color }}
                        title={`${localizeTitle(s, t, m.label[lang])} · ${fmtDistance(s.distance, units, 1)}`}
                      >
                        {localizeTitle(s, t, m.label[lang])}
                      </motion.button>
                    );
                  })}
                  {list.length > (view === "week" ? 12 : 3) && (
                    <div className="px-1 text-[10px] text-faint">+{list.length - 3}</div>
                  )}
                </div>
                {view === "week" && list.length > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] text-faint tabular-nums">
                    {fmtDistance(sumBy(list, (s) => s.distance), units, 0)} · {fmtDurationCompact(sumBy(list, (s) => s.duration))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <p className="mt-3 text-xs text-faint">{lang === "fr" ? "Astuce : glissez une séance pour la replanifier, survolez un jour pour en ajouter une. Vos objectifs apparaissent à leur date cible." : "Tip: drag a session to reschedule, hover a day to add one. Your goals appear on their target date."}</p>

      {modal && (
        <SessionModal open={!!modal} onClose={() => setModal(null)} discipline={modal.disc} defaultDate={modal.date} planned />
      )}
      <SessionModal open={!!editing} onClose={() => setEditing(null)} discipline={editing?.discipline ?? "run"} editing={editing} />
      <GoalModal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} editing={goalEditing} />
    </div>
  );
}
