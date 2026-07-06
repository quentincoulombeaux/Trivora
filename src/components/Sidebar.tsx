"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Footprints, Bike, Waves, CalendarDays, History,
  LineChart, Sparkles, Settings,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cx } from "./ui";

const groups = [
  {
    key: "main",
    items: [{ href: "/", icon: LayoutDashboard, label: "nav.dashboard" }],
  },
  {
    key: "nav.section.train",
    items: [
      { href: "/run", icon: Footprints, label: "nav.run", accent: "var(--run)" },
      { href: "/bike", icon: Bike, label: "nav.bike", accent: "var(--bike)" },
      { href: "/swim", icon: Waves, label: "nav.swim", accent: "var(--swim)" },
    ],
  },
  {
    key: "nav.section.plan",
    items: [
      { href: "/calendar", icon: CalendarDays, label: "nav.calendar" },
      { href: "/history", icon: History, label: "nav.history" },
    ],
  },
  {
    key: "nav.section.insights",
    items: [
      { href: "/analytics", icon: LineChart, label: "nav.analytics" },
      { href: "/coach", icon: Sparkles, label: "nav.coach" },
      { href: "/settings", icon: Settings, label: "nav.settings" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="flex h-full flex-col gap-6 px-3 py-5">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2.5">
        <Image src="/logo.png" alt="Trivora" width={469} height={391} priority className="h-8 w-auto" />
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight">Trivora</div>
          <div className="text-[10px] text-faint mt-0.5">{t("app.tagline")}</div>
        </div>
      </Link>

      <div className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.key}>
            {g.key !== "main" && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {t(g.key)}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cx(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active ? "text-fg" : "text-muted hover:text-fg hover:bg-surface-2"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-surface-2 border border-border"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon
                      size={18}
                      className="relative z-10 shrink-0"
                      style={active && "accent" in item ? { color: (item as { accent?: string }).accent } : undefined}
                    />
                    <span className="relative z-10">{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
