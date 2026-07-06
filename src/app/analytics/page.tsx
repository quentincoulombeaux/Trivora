"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Card, CardHeader, DISC_META, EmptyState, SectionTitle, cx } from "@/components/ui";
import { LoadChart, StackedVolume, TrendChart } from "@/components/charts";
import { loadModel, metricTrend, weeklyVolume, SeriesPoint } from "@/lib/selectors";
import { Discipline } from "@/lib/types";

type Tab = "global" | Discipline;
const KM_TO_MI = 0.621371;

export default function Analytics() {
  const { t, lang } = useI18n();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.profile.units);
  const [tab, setTab] = useState<Tab>("global");
  const [weeks, setWeeks] = useState(16);
  const distUnit = units === "imperial" ? "mi" : "km";
  const speedUnit = units === "imperial" ? "mph" : "km/h";
  const paceUnit = units === "imperial" ? "/mi" : "/km";

  const convDist = (km: number) => (units === "imperial" ? +(km * KM_TO_MI).toFixed(2) : km);

  const volume = useMemo(() => {
    const raw = weeklyVolume(sessions, weeks);
    return raw.map((p) => ({
      ...p,
      run: convDist(p.run as number), bike: convDist(p.bike as number), swim: convDist(p.swim as number),
    }));
  }, [sessions, weeks, units]);
  const load = useMemo(() => loadModel(sessions, weeks * 7), [sessions, weeks]);

  // discipline trends with unit-aware transforms
  const trend = (d: Discipline, metric: Parameters<typeof metricTrend>[2]): SeriesPoint[] => {
    const raw = metricTrend(sessions, d, metric);
    if (metric === "distance") return raw.map((p) => ({ ...p, value: convDist(p.value as number) }));
    if (metric === "speed") return raw.map((p) => ({ ...p, value: units === "imperial" ? +((p.value as number) * KM_TO_MI).toFixed(2) : p.value }));
    if (metric === "pace" && d !== "swim" && units === "imperial") return raw.map((p) => ({ ...p, value: +((p.value as number) / KM_TO_MI).toFixed(0) }));
    return raw;
  };

  const tabs: { key: Tab; label: string; color?: string }[] = [
    { key: "global", label: t("analytics.global") },
    { key: "run", label: DISC_META.run.label[lang], color: "rgb(var(--run))" },
    { key: "bike", label: DISC_META.bike.label[lang], color: "rgb(var(--bike))" },
    { key: "swim", label: DISC_META.swim.label[lang], color: "rgb(var(--swim))" },
  ];
  const ctlLabel = lang === "fr" ? "Forme (CTL)" : "Fitness (CTL)";
  const atlLabel = lang === "fr" ? "Fatigue (ATL)" : "Fatigue (ATL)";

  return (
    <div>
      <SectionTitle title={t("analytics.title")} subtitle={t("analytics.subtitle")} action={
        <div className="flex rounded-xl border border-border bg-surface p-0.5 text-xs">
          {[4, 8, 16, 26, 52].map((w) => (
            <button key={w} onClick={() => setWeeks(w)} className={cx("btn px-2.5 py-1.5", weeks === w ? "bg-surface-2 text-fg" : "text-muted")}>
              {lang === "fr" ? `${w} ${t("unit.weeksShort")}` : `${w}${t("unit.weeksShort")}`}
            </button>
          ))}
        </div>
      } />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={cx("btn border text-sm", tab === tb.key ? "bg-surface border-border-strong text-fg shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-surface-2")}
            style={tab === tb.key && tb.color ? { color: tb.color } : undefined}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "global" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader title={`${t("analytics.volume")} (${distUnit})`} />
            <StackedVolume data={volume} lang={lang} unit={distUnit} labels={{ run: DISC_META.run.label[lang], bike: DISC_META.bike.label[lang], swim: DISC_META.swim.label[lang] }} />
          </Card>
          <Card className="lg:col-span-2" delay={0.05}>
            <CardHeader title={t("analytics.loadTrend")} />
            <LoadChart data={load} lang={lang} labels={{ ctl: ctlLabel, atl: atlLabel }} />
          </Card>
        </div>
      )}

      {tab === "run" && (
        <Grid>
          <TrendCard title={`${t("analytics.paceTrend")} (${paceUnit})`} data={trend("run", "pace")} color="rgb(var(--run))" lang={lang} unit={paceUnit} pace invert empty={t("common.noData")} />
          <TrendCard title={`${t("analytics.volume")} (${distUnit})`} data={trend("run", "distance")} color="rgb(var(--run))" lang={lang} unit={distUnit} empty={t("common.noData")} />
          <TrendCard title={`${t("analytics.hrTrend")} (bpm)`} data={trend("run", "hr")} color="rgb(var(--run))" lang={lang} unit="bpm" empty={t("common.noData")} />
        </Grid>
      )}

      {tab === "bike" && (
        <Grid>
          <TrendCard title={`${t("analytics.speedTrend")} (${speedUnit})`} data={trend("bike", "speed")} color="rgb(var(--bike))" lang={lang} unit={speedUnit} empty={t("common.noData")} />
          <TrendCard title={`${t("analytics.powerTrend")} (W)`} data={trend("bike", "power")} color="rgb(var(--bike))" lang={lang} unit="W" empty={t("common.noData")} />
          <TrendCard title={`${t("analytics.cadenceTrend")} (rpm)`} data={trend("bike", "cadence")} color="rgb(var(--bike))" lang={lang} unit="rpm" empty={t("common.noData")} />
        </Grid>
      )}

      {tab === "swim" && (
        <Grid>
          <TrendCard title={`${t("analytics.paceTrend")} (/100m)`} data={trend("swim", "pace")} color="rgb(var(--swim))" lang={lang} unit="/100m" pace invert empty={t("common.noData")} />
          <TrendCard title={t("analytics.swolfTrend")} data={trend("swim", "swolf")} color="rgb(var(--swim))" lang={lang} unit="SWOLF" invert empty={t("common.noData")} />
          <TrendCard title={`${t("analytics.volume")} (${distUnit})`} data={trend("swim", "distance")} color="rgb(var(--swim))" lang={lang} unit={distUnit} empty={t("common.noData")} />
        </Grid>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-2">{children}</div>;
}

function TrendCard({ title, data, color, lang, unit, invert, pace, empty }: {
  title: string; data: SeriesPoint[]; color: string; lang: "en" | "fr"; unit: string; invert?: boolean; pace?: boolean; empty: string;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      {data.length > 1 ? <TrendChart data={data} color={color} name={title} lang={lang} unit={unit} invert={invert} pace={pace} /> : <EmptyState title={empty} />}
    </Card>
  );
}
