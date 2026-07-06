"use client";

import { useRef, useState } from "react";
import { Check, Download, Upload, RotateCcw, Trash2, FileUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, CardHeader, SectionTitle, cx } from "@/components/ui";
import { Language, Units, Theme, AppData, Sex } from "@/lib/types";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { t, setLang } = useI18n();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetWithSamples = useStore((s) => s.resetWithSamples);
  const clearAll = useStore((s) => s.clearAll);
  const sessions = useStore((s) => s.sessions);

  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1400); }

  function onExportJson() {
    download(`trivora-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportData(), null, 2), "application/json");
  }
  function onExportCsv() {
    const headers = ["date", "discipline", "title", "distance_m", "duration_s", "elevation_m", "avg_hr", "max_hr", "power_w", "cadence", "pool_length_m", "stroke", "rpe"];
    const rows = sessions.map((s) => [s.date, s.discipline, s.title || "", s.distance, s.duration, s.elevation ?? "", s.avgHr ?? "", s.maxHr ?? "", s.power ?? "", s.cadence ?? "", s.poolLength ?? "", s.strokeType ?? "", s.rpe ?? ""].join(","));
    download(`trivora-sessions-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv");
  }
  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result)) as AppData;
        importData(data);
        flash();
      } catch { alert("Invalid JSON file"); }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  const seg = (active: boolean) =>
    cx("btn flex-1 py-2 text-sm", active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg");

  return (
    <div className="max-w-3xl">
      <SectionTitle title={t("settings.title")} subtitle="Trivora" action={
        saved ? <span className="chip bg-bike/15 text-bike"><Check size={13} /> {t("settings.saved")}</span> : undefined
      } />

      <div className="space-y-5">
        <Card>
          <CardHeader title={t("settings.profile")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t("settings.firstName")}</label>
              <input className="input" value={profile.firstName} onChange={(e) => { updateProfile({ firstName: e.target.value }); }} onBlur={flash} />
            </div>
            <div>
              <label className="label">{t("settings.lastName")}</label>
              <input className="input" value={profile.lastName} onChange={(e) => { updateProfile({ lastName: e.target.value }); }} onBlur={flash} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t("settings.language")}</label>
              <div className="flex rounded-xl border border-border bg-surface-2 p-0.5">
                {(["en", "fr"] as Language[]).map((l) => (
                  <button key={l} className={seg(profile.language === l)} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t("settings.units")}</label>
              <div className="flex rounded-xl border border-border bg-surface-2 p-0.5">
                {(["metric", "imperial"] as Units[]).map((u) => (
                  <button key={u} className={seg(profile.units === u)} onClick={() => { updateProfile({ units: u }); flash(); }}>{t(`settings.${u}`)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t("settings.theme")}</label>
              <div className="flex rounded-xl border border-border bg-surface-2 p-0.5">
                {(["light", "dark", "system"] as Theme[]).map((th) => (
                  <button key={th} className={seg(profile.theme === th)} onClick={() => { updateProfile({ theme: th }); }}>{t(`settings.${th}`)}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card delay={0.05}>
          <CardHeader title={t("settings.body")} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">{t("settings.weight")} (kg)</label>
              <input className="input" inputMode="decimal" value={profile.weight ?? ""} onChange={(e) => updateProfile({ weight: e.target.value ? parseFloat(e.target.value) : undefined })} onBlur={flash} placeholder="72" />
            </div>
            <div>
              <label className="label">{t("settings.height")} (cm)</label>
              <input className="input" inputMode="decimal" value={profile.height ?? ""} onChange={(e) => updateProfile({ height: e.target.value ? parseFloat(e.target.value) : undefined })} onBlur={flash} placeholder="178" />
            </div>
            <div>
              <label className="label">{t("settings.age")}</label>
              <input className="input" inputMode="numeric" value={profile.age ?? ""} onChange={(e) => updateProfile({ age: e.target.value ? parseFloat(e.target.value) : undefined })} onBlur={flash} placeholder="30" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">{t("settings.sex")}</label>
            <div className="flex max-w-sm rounded-xl border border-border bg-surface-2 p-0.5">
              {(["male", "female", "unspecified"] as Sex[]).map((sx) => (
                <button key={sx} className={seg(profile.sex === sx)} onClick={() => { updateProfile({ sex: sx }); flash(); }}>{t(`sex.${sx}`)}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-faint">{t("settings.bodyHint")}</p>
          </div>
        </Card>

        <Card delay={0.1}>
          <CardHeader title={t("settings.data")} />
          <p className="text-sm text-muted mb-4">{t("settings.dataDesc")}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={onExportJson}><Download size={15} /> {t("settings.export")}</button>
            <button className="btn-outline" onClick={onExportCsv}><Download size={15} /> {t("settings.exportCsv")}</button>
            <button className="btn-outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> {t("settings.import")}</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <button className="btn-ghost" onClick={() => { if (confirm("Reset to sample data?")) resetWithSamples(); }}><RotateCcw size={15} /> {t("settings.reset")}</button>
            <button className="btn-ghost text-red-500" onClick={() => { if (confirm("Delete all sessions and goals?")) clearAll(); }}><Trash2 size={15} /> {t("settings.clear")}</button>
          </div>
        </Card>

        <Card delay={0.1}>
          <CardHeader title={t("settings.imports")} />
          <p className="text-sm text-muted mb-4">{t("settings.importsDesc")}</p>
          <label className="flex cursor-not-allowed flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2 py-10 text-center opacity-70">
            <FileUp size={22} className="text-faint mb-2" />
            <span className="text-sm font-medium text-muted">GPX · FIT · TCX</span>
            <span className="text-xs text-faint mt-1">Garmin · Coros · Strava · Polar · Suunto</span>
          </label>
        </Card>
      </div>
    </div>
  );
}
