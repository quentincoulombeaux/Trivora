"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Target, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Discipline, Goal, GoalType } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { distanceUnit, distanceValue } from "@/lib/format";
import { DISC_META, cx } from "./ui";

const KM_TO_MI = 0.621371;
const GOAL_TYPES: GoalType[] = [
  "marathon", "half-marathon", "ironman", "half-ironman", "monthly-distance", "weekly-volume", "race",
];

function metricFor(type: GoalType): Goal["metric"] {
  if (type === "marathon" || type === "half-marathon") return "time";
  if (type === "monthly-distance" || type === "weekly-volume") return "distance";
  return "count";
}
function defaultDiscipline(type: GoalType): Discipline | undefined {
  return type === "marathon" || type === "half-marathon" ? "run" : undefined;
}
function parseDuration(v: string): number {
  if (!v.trim()) return 0;
  const parts = v.split(":").map((x) => parseInt(x, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function fmtTimeInput(sec: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Goal | null;
}

export function GoalModal({ open, onClose, editing }: Props) {
  const { t, lang } = useI18n();
  const units = useStore((s) => s.profile.units);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("marathon");
  const [discipline, setDiscipline] = useState<Discipline | "">("");
  const [timeInput, setTimeInput] = useState("");
  const [distInput, setDistInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [err, setErr] = useState("");

  const metric = metricFor(type);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type);
      setDiscipline(editing.discipline ?? "");
      setTimeInput(editing.metric === "time" ? fmtTimeInput(editing.target) : "");
      setDistInput(editing.metric === "distance" ? String(+distanceValue(editing.target, units).toFixed(1)) : "");
      setDeadline(editing.deadline ?? "");
    } else {
      setTitle("");
      setType("marathon");
      setDiscipline("run");
      setTimeInput("");
      setDistInput("");
      setDeadline("");
    }
    setErr("");
  }, [open, editing, units]);

  function onTypeChange(tp: GoalType) {
    setType(tp);
    const d = defaultDiscipline(tp);
    setDiscipline(d ?? "");
  }

  function submit() {
    if (!title.trim()) { setErr(t("form.required")); return; }
    let target = 1;
    if (metric === "time") {
      target = parseDuration(timeInput);
      if (target <= 0) { setErr(t("form.required")); return; }
    } else if (metric === "distance") {
      const n = parseFloat(distInput);
      if (isNaN(n) || n <= 0) { setErr(t("form.required")); return; }
      target = Math.round(units === "imperial" ? (n / KM_TO_MI) * 1000 : n * 1000);
    }
    const payload: Omit<Goal, "id" | "createdAt"> = {
      title: title.trim(),
      type,
      metric,
      discipline: discipline || undefined,
      target,
      deadline: deadline || undefined,
    };
    if (editing) updateGoal(editing.id, payload);
    else addGoal(payload);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto card shadow-pop rounded-b-none sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface/90 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <Target size={17} className="text-brand" />
                <h3 className="font-semibold">{editing ? t("goal.edit") : t("goal.add")}</h3>
              </div>
              <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label">{t("goal.title")}</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sub-3:30 Marathon" />
              </div>

              <div>
                <label className="label">{t("goal.type")}</label>
                <select className="input" value={type} onChange={(e) => onTypeChange(e.target.value as GoalType)}>
                  {GOAL_TYPES.map((gt) => (<option key={gt} value={gt}>{t(`goaltype.${gt}`)}</option>))}
                </select>
              </div>

              {metric === "time" && (
                <div>
                  <label className="label">{t("goal.targetTime")}</label>
                  <input className="input" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="3:30:00" />
                  <p className="text-[11px] text-faint mt-1">{t("form.durationHint")}</p>
                </div>
              )}
              {metric === "distance" && (
                <div>
                  <label className="label">{t("goal.targetDistance")} ({distanceUnit(units)})</label>
                  <input className="input" inputMode="decimal" value={distInput} onChange={(e) => setDistInput(e.target.value)} placeholder="200" />
                </div>
              )}

              <div>
                <label className="label">{t("goal.discipline")}</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setDiscipline("")} className={cx("btn border py-2 text-sm", discipline === "" ? "bg-surface-2 border-border-strong text-fg" : "border-border text-muted hover:text-fg")}>
                    {t("common.none")}
                  </button>
                  {(["run", "bike", "swim"] as Discipline[]).map((d) => {
                    const m = DISC_META[d];
                    const active = discipline === d;
                    return (
                      <button key={d} onClick={() => setDiscipline(d)}
                        className={cx("btn border py-2 text-sm font-medium", active ? "text-white" : "border-border bg-surface-2 text-muted hover:text-fg")}
                        style={active ? { background: m.color, borderColor: m.color } : undefined}>
                        {m.label[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">{t("goal.deadline")}</label>
                <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              {err && <p className="text-xs text-red-500">{err}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-surface/90 backdrop-blur">
              <div>
                {editing && (
                  <button className="btn-ghost text-red-500" onClick={() => { deleteGoal(editing.id); onClose(); }}>
                    <Trash2 size={15} /> {t("common.delete")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
                <button className="btn-primary" onClick={submit}>{t("common.save")}</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
