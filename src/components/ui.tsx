"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import React, { useState } from "react";
import { Discipline } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const DISC_META: Record<
  Discipline,
  { label: { en: string; fr: string }; color: string; bg: string; text: string }
> = {
  run: { label: { en: "Running", fr: "Course" }, color: "rgb(var(--run))", bg: "bg-run/10", text: "text-run" },
  bike: { label: { en: "Cycling", fr: "Vélo" }, color: "rgb(var(--bike))", bg: "bg-bike/10", text: "text-bike" },
  swim: { label: { en: "Swimming", fr: "Natation" }, color: "rgb(var(--swim))", bg: "bg-swim/10", text: "text-swim" },
};

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cx("card p-5", className)}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("relative overflow-hidden rounded-lg bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.06]" />
    </div>
  );
}

export function DiscDot({ d, className }: { d: Discipline; className?: string }) {
  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", className)} style={{ background: DISC_META[d].color }} />;
}

export function InfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-faint hover:text-fg transition -m-1 p-1"
        aria-label="info"
      >
        <Info size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-72 max-w-[80vw] rounded-xl border border-border bg-elevated p-3.5 text-xs leading-relaxed text-muted shadow-pop whitespace-pre-line">
            {text}
          </div>
        </>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  info?: string;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-surface-2 p-4">
      {info && (
        <div className="absolute right-2.5 top-2.5">
          <InfoButton text={info} />
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div className="stat-value mt-1.5" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-faint mt-1">{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="h-12 w-12 rounded-2xl bg-surface-2 border border-border mb-3" />
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="text-xs text-muted mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}
