"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { BlockType, Discipline, Session, SessionBlock, StrokeType } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { distanceUnit, distanceValue } from "@/lib/format";
import { isoDate, paceSecPer100m, paceSecPerKm, speedKmh, swolf } from "@/lib/calc";
import { DISC_META, cx } from "./ui";

const KM_TO_MI = 0.621371;

const BLOCK_TYPES: BlockType[] = [
  "warmup", "base", "endurance", "tempo", "threshold", "interval", "power", "technique", "recovery", "cooldown", "custom",
];
const BLOCK_COLOR: Record<BlockType, string> = {
  warmup: "#f59e0b", base: "#64748b", endurance: "#22c55e", tempo: "#f97316",
  threshold: "#ef4444", interval: "#8b5cf6", power: "#eab308", technique: "#0ea5e9",
  recovery: "#14b8a6", cooldown: "#06b6d4", custom: "#94a3b8",
};

function parseDuration(v: string): number {
  if (!v.trim()) return 0;
  const parts = v.split(":").map((x) => parseInt(x, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] * 60;
  return 0;
}
function fmtDurationInput(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function paceInput(sec?: number): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function toMeters(v: string, units: "metric" | "imperial"): number {
  const n = parseFloat(v);
  if (isNaN(n)) return 0;
  return units === "imperial" ? (n / KM_TO_MI) * 1000 : n * 1000;
}

interface BlockDraft {
  id: string;
  type: BlockType;
  repeat: string;
  dist: string;
  dur: string;
  target: string;
  note: string;
}
function newDraft(): BlockDraft {
  return { id: Math.random().toString(36).slice(2, 9), type: "warmup", repeat: "", dist: "", dur: "", target: "", note: "" };
}

interface Props {
  open: boolean;
  onClose: () => void;
  discipline: Discipline;
  editing?: Session | null;
  defaultDate?: string;
  planned?: boolean;
}

export function SessionModal({ open, onClose, discipline, editing, defaultDate, planned }: Props) {
  const { t, lang } = useI18n();
  const units = useStore((s) => s.profile.units);
  const addSession = useStore((s) => s.addSession);
  const updateSession = useStore((s) => s.updateSession);

  const [disc, setDisc] = useState<Discipline>(discipline);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [dist, setDist] = useState("");
  const [dur, setDur] = useState("");
  const [elev, setElev] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [power, setPower] = useState("");
  const [cadence, setCadence] = useState("");
  const [pool, setPool] = useState("25");
  const [stroke, setStroke] = useState<StrokeType>("freestyle");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const e = editing;
    setDisc(e?.discipline ?? discipline);
    setDate(e?.date ?? defaultDate ?? isoDate(new Date()));
    setTitle(e?.title ?? "");
    setDist(e ? String(+distanceValue(e.distance, units).toFixed(2)) : "");
    setDur(e ? fmtDurationInput(e.duration) : "");
    setElev(e?.elevation != null ? String(e.elevation) : "");
    setAvgHr(e?.avgHr != null ? String(e.avgHr) : "");
    setMaxHr(e?.maxHr != null ? String(e.maxHr) : "");
    setPower(e?.power != null ? String(e.power) : "");
    setCadence(e?.cadence != null ? String(e.cadence) : "");
    setPool(e?.poolLength != null ? String(e.poolLength) : "25");
    setStroke(e?.strokeType ?? "freestyle");
    setRpe(e?.rpe != null ? String(e.rpe) : "");
    setNotes(e?.notes ?? "");
    const d = e?.discipline ?? discipline;
    setBlocks(
      (e?.blocks ?? []).map((b) => ({
        id: b.id, type: b.type,
        repeat: b.repeat ? String(b.repeat) : "",
        dist: b.distance ? String(+distanceValue(b.distance, units).toFixed(2)) : "",
        dur: b.duration ? fmtDurationInput(b.duration) : "",
        target: d === "bike" ? (b.targetPower ? String(b.targetPower) : "") : paceInput(b.targetPace),
        note: b.note ?? "",
      }))
    );
    setErr("");
  }, [open, editing, defaultDate, units, discipline]);

  const distMeters = toMeters(dist, units);
  const durSec = parseDuration(dur);
  const meta = DISC_META[disc];

  // live computed metrics
  const computed: { label: string; value: string }[] = [];
  if (distMeters > 0 && durSec > 0) {
    if (disc === "run") {
      const p = paceSecPerKm(distMeters, durSec);
      const perUnit = units === "imperial" ? p / KM_TO_MI : p;
      computed.push({ label: t("common.pace"), value: `${Math.floor(perUnit / 60)}:${String(Math.round(perUnit % 60)).padStart(2, "0")} /${distanceUnit(units)}` });
      computed.push({ label: t("common.speed"), value: `${speedKmh(distMeters, durSec).toFixed(1)} ${units === "imperial" ? "mph" : "km/h"}` });
    } else if (disc === "bike") {
      computed.push({ label: t("common.speed"), value: `${(units === "imperial" ? speedKmh(distMeters, durSec) * KM_TO_MI : speedKmh(distMeters, durSec)).toFixed(1)} ${units === "imperial" ? "mph" : "km/h"}` });
    } else {
      const p = paceSecPer100m(distMeters, durSec);
      computed.push({ label: "/100m", value: `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}` });
      const sw = swolf({ discipline: "swim", distance: distMeters, duration: durSec, poolLength: parseFloat(pool) || 25, cadence: parseFloat(cadence) || undefined } as Session);
      if (sw) computed.push({ label: "SWOLF", value: String(sw) });
    }
  }

  // block totals
  const totals = blocks.reduce(
    (acc, b) => {
      const r = parseInt(b.repeat, 10) || 1;
      acc.dist += toMeters(b.dist, units) * r;
      acc.dur += parseDuration(b.dur) * r;
      return acc;
    },
    { dist: 0, dur: 0 }
  );

  function setBlock(id: string, patch: Partial<BlockDraft>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function applyTotals() {
    if (totals.dist > 0) setDist(String(+distanceValue(totals.dist, units).toFixed(2)));
    if (totals.dur > 0) setDur(fmtDurationInput(totals.dur));
  }

  function targetPlaceholder(): string {
    if (disc === "bike") return "W";
    return disc === "swim" ? "/100m" : `/${distanceUnit(units)}`;
  }

  function submit() {
    if (distMeters <= 0 || durSec <= 0) {
      setErr(t("form.required"));
      return;
    }
    const blockPayload: SessionBlock[] = blocks
      .filter((b) => b.dist || b.dur || b.target || b.note)
      .map((b) => {
        const r = parseInt(b.repeat, 10);
        const blk: SessionBlock = { id: b.id, type: b.type };
        if (!isNaN(r) && r > 0) blk.repeat = r;
        const m = toMeters(b.dist, units);
        if (m > 0) blk.distance = Math.round(m);
        const ds = parseDuration(b.dur);
        if (ds > 0) blk.duration = ds;
        if (b.target) {
          if (disc === "bike") {
            const w = parseFloat(b.target);
            if (!isNaN(w)) blk.targetPower = w;
          } else {
            const p = parseDuration(b.target);
            if (p > 0) blk.targetPace = p;
          }
        }
        if (b.note) blk.note = b.note;
        return blk;
      });

    const payload: Omit<Session, "id" | "createdAt"> = {
      discipline: disc,
      date,
      title: title || undefined,
      titleKey: editing?.title === title ? editing?.titleKey : undefined,
      distance: Math.round(distMeters),
      duration: durSec,
      elevation: elev ? parseFloat(elev) : undefined,
      avgHr: avgHr ? parseFloat(avgHr) : undefined,
      maxHr: maxHr ? parseFloat(maxHr) : undefined,
      power: power ? parseFloat(power) : undefined,
      cadence: cadence ? parseFloat(cadence) : undefined,
      poolLength: disc === "swim" ? parseFloat(pool) || 25 : undefined,
      strokeType: disc === "swim" ? stroke : undefined,
      rpe: rpe ? parseFloat(rpe) : undefined,
      notes: notes || undefined,
      blocks: blockPayload.length ? blockPayload : undefined,
      planned: planned ?? editing?.planned,
    };
    if (editing) updateSession(editing.id, payload);
    else addSession(payload);
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
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto card shadow-pop rounded-b-none sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface/90 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full transition-colors" style={{ background: meta.color }} />
                <h3 className="font-semibold">{editing ? t("form.editSession") : t("form.newSession")}</h3>
              </div>
              <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Sport selector */}
              <div>
                <label className="label">{t("form.sport")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["run", "bike", "swim"] as Discipline[]).map((d) => {
                    const m = DISC_META[d];
                    const active = disc === d;
                    return (
                      <button key={d} onClick={() => setDisc(d)}
                        className={cx("btn border py-2 text-sm font-medium transition", active ? "text-white shadow-sm" : "border-border bg-surface-2 text-muted hover:text-fg")}
                        style={active ? { background: m.color, borderColor: m.color } : undefined}>
                        {m.label[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t("common.date")}</label>
                  <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t("common.title")}</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.label[lang]} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t("common.distance")} ({distanceUnit(units)})</label>
                  <input className="input" inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} placeholder="10" />
                </div>
                <div>
                  <label className="label">{t("common.duration")}</label>
                  <input className="input" value={dur} onChange={(e) => setDur(e.target.value)} placeholder="0:45:00" />
                  <p className="text-[11px] text-faint mt-1">{t("form.durationHint")}</p>
                </div>
              </div>

              {disc !== "swim" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t("common.elevation")} (m)</label>
                    <input className="input" inputMode="numeric" value={elev} onChange={(e) => setElev(e.target.value)} />
                  </div>
                  {disc === "bike" && (
                    <div>
                      <label className="label">{t("common.power")} (W)</label>
                      <input className="input" inputMode="numeric" value={power} onChange={(e) => setPower(e.target.value)} />
                    </div>
                  )}
                  {disc === "run" && (
                    <div>
                      <label className="label">{t("common.avgHr")}</label>
                      <input className="input" inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {disc === "bike" && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label">{t("common.cadence")}</label><input className="input" inputMode="numeric" value={cadence} onChange={(e) => setCadence(e.target.value)} /></div>
                  <div><label className="label">{t("common.avgHr")}</label><input className="input" inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} /></div>
                  <div><label className="label">{t("common.maxHr")}</label><input className="input" inputMode="numeric" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} /></div>
                </div>
              )}

              {disc === "run" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">{t("common.maxHr")}</label><input className="input" inputMode="numeric" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} /></div>
                </div>
              )}

              {disc === "swim" && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label">{t("common.poolLength")} (m)</label><input className="input" inputMode="numeric" value={pool} onChange={(e) => setPool(e.target.value)} /></div>
                  <div>
                    <label className="label">{t("common.stroke")}</label>
                    <select className="input" value={stroke} onChange={(e) => setStroke(e.target.value as StrokeType)}>
                      <option value="freestyle">{t("stroke.freestyle")}</option>
                      <option value="breaststroke">{t("stroke.breaststroke")}</option>
                      <option value="backstroke">{t("stroke.backstroke")}</option>
                      <option value="butterfly">{t("stroke.butterfly")}</option>
                      <option value="medley">{t("stroke.medley")}</option>
                    </select>
                  </div>
                  <div><label className="label">{t("common.avgHr")}</label><input className="input" inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} /></div>
                </div>
              )}

              <div>
                <label className="label">{t("common.rpe")} (1–10)</label>
                <input className="input" inputMode="numeric" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="5" />
              </div>

              {/* Session structure / blocks */}
              <div className="rounded-xl border border-border bg-surface-2/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{t("form.structure")}</span>
                  <button className="btn-ghost text-xs px-2 py-1" style={{ color: meta.color }} onClick={() => setBlocks((bs) => [...bs, newDraft()])}>
                    <Plus size={14} /> {t("form.addBlock")}
                  </button>
                </div>

                <div className="space-y-2">
                  {blocks.map((b, idx) => (
                    <div key={b.id} className="rounded-lg border border-border bg-surface p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: BLOCK_COLOR[b.type] }} />
                        <select className="input flex-1 py-1.5 text-sm" value={b.type} onChange={(e) => setBlock(b.id, { type: e.target.value as BlockType })}>
                          {BLOCK_TYPES.map((bt) => (<option key={bt} value={bt}>{t(`block.${bt}`)}</option>))}
                        </select>
                        <input className="input w-16 py-1.5 text-center" inputMode="numeric" value={b.repeat} onChange={(e) => setBlock(b.id, { repeat: e.target.value })} placeholder={`×${idx ? "" : "1"}`} title={t("block.repeat")} />
                        <button className="btn-ghost p-1.5 text-red-500" onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}><Trash2 size={14} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input className="input py-1.5 text-sm" value={b.dist} onChange={(e) => setBlock(b.id, { dist: e.target.value })} placeholder={distanceUnit(units)} title={t("common.distance")} />
                        <input className="input py-1.5 text-sm" value={b.dur} onChange={(e) => setBlock(b.id, { dur: e.target.value })} placeholder="mm:ss" title={t("common.duration")} />
                        <input className="input py-1.5 text-sm" value={b.target} onChange={(e) => setBlock(b.id, { target: e.target.value })} placeholder={targetPlaceholder()} title={disc === "bike" ? t("block.targetPower") : t("block.targetPace")} />
                      </div>
                      <input className="input py-1.5 text-sm" value={b.note} onChange={(e) => setBlock(b.id, { note: e.target.value })} placeholder={t("block.note")} />
                    </div>
                  ))}
                </div>

                {blocks.length > 0 && (totals.dist > 0 || totals.dur > 0) && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {t("form.blocksTotal")}: <span className="font-semibold tabular-nums">{(units === "imperial" ? totals.dist / 1000 * KM_TO_MI : totals.dist / 1000).toFixed(1)} {distanceUnit(units)}</span>
                      {totals.dur > 0 && <span className="font-semibold tabular-nums"> · {fmtDurationInput(totals.dur)}</span>}
                    </span>
                    <button className="btn-ghost text-xs px-2 py-1" onClick={applyTotals}>{t("form.applyTotals")}</button>
                  </div>
                )}
              </div>

              {computed.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {computed.map((c) => (
                    <span key={c.label} className={cx("chip", meta.bg, meta.text)}>
                      {c.label}: <span className="font-semibold tabular-nums">{c.value}</span>
                    </span>
                  ))}
                </div>
              )}

              {err && <p className="text-xs text-red-500">{err}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-surface/90 backdrop-blur">
              <button className="btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
              <button className="btn text-white hover:opacity-90" style={{ background: meta.color }} onClick={submit}>{t("common.save")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
