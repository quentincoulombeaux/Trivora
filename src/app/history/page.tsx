"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Table2, GitCommitVertical, Trash2, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, DISC_META, EmptyState, SectionTitle, cx } from "@/components/ui";
import { SessionModal } from "@/components/SessionModal";
import { Discipline, Session } from "@/lib/types";
import { fmtDistance, fmtDuration, fmtPace, fmtPace100, fmtSpeed } from "@/lib/format";
import { paceSecPer100m, paceSecPerKm, speedKmh } from "@/lib/calc";
import { localizeTitle } from "@/lib/titles";

type Period = "all" | "7d" | "30d" | "90d" | "365d";
type Sort = "dateDesc" | "dateAsc" | "distance" | "duration";
const PER_PAGE = 12;

export default function History() {
  const { t, lang } = useI18n();
  const units = useStore((s) => s.profile.units);
  const sessions = useStore((s) => s.sessions);
  const deleteSession = useStore((s) => s.deleteSession);

  const [q, setQ] = useState("");
  const [disc, setDisc] = useState<Discipline | "all">("all");
  const [period, setPeriod] = useState<Period>("all");
  const [sort, setSort] = useState<Sort>("dateDesc");
  const [view, setView] = useState<"table" | "timeline">("table");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Session | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff: Record<Period, number> = {
      all: 0, "7d": 7, "30d": 30, "90d": 90, "365d": 365,
    };
    let list = sessions.filter((s) => !s.planned);
    if (disc !== "all") list = list.filter((s) => s.discipline === disc);
    if (period !== "all") {
      const ms = cutoff[period] * 86400000;
      list = list.filter((s) => now - new Date(s.date).getTime() <= ms);
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((s) => localizeTitle(s, t, DISC_META[s.discipline].label[lang]).toLowerCase().includes(needle) || DISC_META[s.discipline].label[lang].toLowerCase().includes(needle));
    }
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "dateAsc": return a.date < b.date ? -1 : 1;
        case "distance": return b.distance - a.distance;
        case "duration": return b.duration - a.duration;
        default: return a.date < b.date ? 1 : -1;
      }
    });
    return list;
  }, [sessions, disc, period, q, sort, lang]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);

  function metric(s: Session): string {
    if (s.discipline === "run") return fmtPace(paceSecPerKm(s.distance, s.duration), units);
    if (s.discipline === "bike") return fmtSpeed(speedKmh(s.distance, s.duration), units);
    return fmtPace100(paceSecPer100m(s.distance, s.duration));
  }

  return (
    <div>
      <SectionTitle title={t("history.title")} subtitle={t("history.subtitle")} action={
        <div className="flex rounded-xl border border-border bg-surface p-0.5">
          <button onClick={() => setView("table")} className={cx("btn px-2.5 py-1.5", view === "table" ? "bg-surface-2 text-fg" : "text-muted")}><Table2 size={15} /></button>
          <button onClick={() => setView("timeline")} className={cx("btn px-2.5 py-1.5", view === "timeline" ? "bg-surface-2 text-fg" : "text-muted")}><GitCommitVertical size={15} /></button>
        </div>
      } />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-9" placeholder={t("common.search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <select className="input lg:w-40" value={disc} onChange={(e) => { setDisc(e.target.value as Discipline | "all"); setPage(0); }}>
              <option value="all">{t("common.all")}</option>
              <option value="run">{DISC_META.run.label[lang]}</option>
              <option value="bike">{DISC_META.bike.label[lang]}</option>
              <option value="swim">{DISC_META.swim.label[lang]}</option>
            </select>
            <select className="input lg:w-44" value={period} onChange={(e) => { setPeriod(e.target.value as Period); setPage(0); }}>
              <option value="all">{t("period.all")}</option>
              <option value="7d">{t("period.7d")}</option>
              <option value="30d">{t("period.30d")}</option>
              <option value="90d">{t("period.90d")}</option>
              <option value="365d">{t("period.365d")}</option>
            </select>
            <select className="input lg:w-44" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="dateDesc">{t("sort.dateDesc")}</option>
              <option value="dateAsc">{t("sort.dateAsc")}</option>
              <option value="distance">{t("sort.distance")}</option>
              <option value="duration">{t("sort.duration")}</option>
            </select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card><EmptyState title={t("history.empty")} /></Card>
      ) : view === "table" ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.discipline")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.title")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.distance")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.duration")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("common.pace")}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s, i) => {
                  const m = DISC_META[s.discipline];
                  return (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="group border-b border-border last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(s.date).toLocaleDateString(lang, { day: "2-digit", month: "short", year: "2-digit" })}</td>
                      <td className="px-4 py-3"><span className="chip" style={{ background: `${m.color}1a`, color: m.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />{m.label[lang]}</span></td>
                      <td className="px-4 py-3 font-medium">{localizeTitle(s, t, m.label[lang])}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtDistance(s.distance, units, 1)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtDuration(s.duration)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{metric(s)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                          <button className="btn-ghost p-1.5" onClick={() => setEditing(s)}><Pencil size={14} /></button>
                          <button className="btn-ghost p-1.5 text-red-500" onClick={() => deleteSession(s.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
            <div className="space-y-5">
              {slice.map((s, i) => {
                const m = DISC_META[s.discipline];
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative">
                    <span className="absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border-2 border-surface" style={{ background: m.color }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{localizeTitle(s, t, m.label[lang])}</div>
                        <div className="text-xs text-faint">{new Date(s.date).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums">{fmtDistance(s.distance, units, 1)}</div>
                        <div className="text-xs text-faint tabular-nums">{fmtDuration(s.duration)} · {metric(s)}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {filtered.length > PER_PAGE && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-muted">{cur * PER_PAGE + 1}–{Math.min((cur + 1) * PER_PAGE, filtered.length)} / {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button className="btn-outline px-2.5 py-1.5" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft size={15} /></button>
            <span className="text-xs text-muted px-2 tabular-nums">{cur + 1} / {pages}</span>
            <button className="btn-outline px-2.5 py-1.5" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      <SessionModal open={!!editing} onClose={() => setEditing(null)} discipline={editing?.discipline ?? "run"} editing={editing} />
    </div>
  );
}
