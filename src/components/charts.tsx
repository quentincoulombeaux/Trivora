"use client";

import type { ReactNode } from "react";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { SeriesPoint } from "@/lib/selectors";

const AXIS = "rgb(var(--faint))";
const GRID = "rgb(var(--border))";
type Lang = "en" | "fr";

const FR_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Parse a YYYY-MM-DD string as a LOCAL date (not UTC) to avoid off-by-one shifts. */
function parseLocal(v: string | number): Date {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
}

function fmtDay(iso: string | number, lang: Lang) {
  return parseLocal(iso).toLocaleDateString(lang, { day: "numeric", month: "short" });
}
function fmtFullDay(iso: string | number, lang: Lang) {
  return parseLocal(iso).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}
function fmtWeekRange(aIso: string, bIso: string, lang: Lang) {
  const s = parseLocal(aIso), e = parseLocal(bIso);
  if (lang === "fr") {
    return s.getMonth() === e.getMonth()
      ? `Semaine du ${s.getDate()} au ${e.getDate()} ${FR_MONTHS[e.getMonth()]}`
      : `Semaine du ${s.getDate()} ${FR_MONTHS[s.getMonth()]} au ${e.getDate()} ${FR_MONTHS[e.getMonth()]}`;
  }
  return `Week of ${fmtDay(aIso, lang)} – ${fmtDay(bIso, lang)}`;
}
function paceFmt(sec: number) {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function tip() {
  return {
    contentStyle: {
      background: "rgb(var(--elevated))", border: "1px solid rgb(var(--border))",
      borderRadius: 12, boxShadow: "var(--shadow-pop)", fontSize: 12, color: "rgb(var(--fg))",
    },
    labelStyle: { color: "rgb(var(--muted))", marginBottom: 4 },
    itemStyle: { color: "rgb(var(--fg))" },
  };
}

const common = { margin: { top: 8, right: 10, bottom: 0, left: -12 } };

/** Stacked weekly volume per discipline. */
export function StackedVolume({
  data, lang, unit = "km", labels, height = 260,
}: { data: SeriesPoint[]; lang: Lang; unit?: string; labels: { run: string; bike: string; swim: string }; height?: number }) {
  const nameMap: Record<string, string> = { run: labels.run, bike: labels.bike, swim: labels.swim };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} {...common}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} tickFormatter={(v) => fmtDay(v, lang)} />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={44} unit={` ${unit}`} />
        <Tooltip {...tip()} cursor={{ fill: "rgb(var(--surface-2))" }}
          labelFormatter={(l, p) => (p && p[0] ? fmtWeekRange((p[0].payload as SeriesPoint).date, (p[0].payload as SeriesPoint).weekEnd!, lang) : String(l))}
          formatter={(value, name) => [`${value} ${unit}`, nameMap[name as string] ?? name]} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} formatter={(v) => nameMap[v] ?? v} />
        <Bar dataKey="run" stackId="v" fill="rgb(var(--run))" />
        <Bar dataKey="bike" stackId="v" fill="rgb(var(--bike))" />
        <Bar dataKey="swim" stackId="v" fill="rgb(var(--swim))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Generic weekly bar chart (distance or session count). */
export function WeeklyBars({
  data, dataKey, color, name, lang, unit = "", height = 240, allowDecimals = true,
}: { data: SeriesPoint[]; dataKey: string; color: string; name: string; lang: Lang; unit?: string; height?: number; allowDecimals?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} {...common}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={16} tickFormatter={(v) => fmtDay(v, lang)} />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={unit ? 44 : 32} unit={unit ? ` ${unit}` : undefined} allowDecimals={allowDecimals} />
        <Tooltip {...tip()} cursor={{ fill: "rgb(var(--surface-2))" }}
          labelFormatter={(l, p) => (p && p[0] ? fmtWeekRange((p[0].payload as SeriesPoint).date, (p[0].payload as SeriesPoint).weekEnd!, lang) : String(l))}
          formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, name]} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={name} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Daily CTL/ATL load model. */
export function LoadChart({
  data, lang, labels, height = 280,
}: { data: SeriesPoint[]; lang: Lang; labels: { ctl: string; atl: string }; height?: number }) {
  const nameMap: Record<string, string> = { ctl: labels.ctl, atl: labels.atl };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} {...common}>
        <defs>
          <linearGradient id="ctl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(v) => fmtDay(v, lang)} />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={36} />
        <Tooltip {...tip()} labelFormatter={(l) => fmtFullDay(l, lang)} formatter={(value, name) => [value, nameMap[name as string] ?? name]} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} formatter={(v) => nameMap[v] ?? v} />
        <Area type="monotone" dataKey="ctl" name="ctl" stroke="rgb(var(--brand))" strokeWidth={2} fill="url(#ctl)" />
        <Line type="monotone" dataKey="atl" name="atl" stroke="rgb(var(--run))" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Per-session metric trend. */
export function TrendChart({
  data, color, name, lang, unit = "", invert, pace, height = 260,
}: { data: SeriesPoint[]; color: string; name: string; lang: Lang; unit?: string; invert?: boolean; pace?: boolean; height?: number }) {
  const id = `grad-${name.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={30} tickFormatter={(v) => fmtDay(v, lang)} />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={pace ? 52 : 62} reversed={invert} domain={["auto", "auto"]}
          tickFormatter={pace ? (v) => paceFmt(v as number) : undefined} unit={!pace && unit ? ` ${unit}` : undefined} />
        <Tooltip {...tip()} labelFormatter={(l) => fmtFullDay(l, lang)}
          formatter={(value) => [pace ? `${paceFmt(value as number)} ${unit}` : `${value}${unit ? ` ${unit}` : ""}`, name]} />
        <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Compact dashboard weekly volume bars. */
export function MiniBars({
  data, color = "rgb(var(--brand))", lang, unit = "km", height = 120,
}: { data: SeriesPoint[]; color?: string; lang: Lang; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(v) => fmtDay(v, lang)} />
        <Tooltip {...tip()} cursor={{ fill: "rgb(var(--surface-2))" }}
          labelFormatter={(l, p) => (p && p[0] ? fmtWeekRange((p[0].payload as SeriesPoint).date, (p[0].payload as SeriesPoint).weekEnd!, lang) : String(l))}
          formatter={(value) => [`${value} ${unit}`, unit]} />
        <Bar dataKey="total" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut chart for distribution (e.g. discipline split). */
export function DonutChart({
  data, formatter, center, height = 210,
}: {
  data: { name: string; value: number; color: string }[];
  formatter: (v: number) => string;
  center?: ReactNode;
  height?: number;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
            {data.map((d, i) => (<Cell key={i} fill={d.color} />))}
          </Pie>
          <Tooltip {...tip()} formatter={(v, n) => [formatter(Number(v)), n]} />
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
      )}
    </div>
  );
}
