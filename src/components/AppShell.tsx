"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const theme = useStore((s) => s.profile.theme);
  const updateProfile = useStore((s) => s.updateProfile);
  const firstName = useStore((s) => s.profile.firstName);
  const { t } = useI18n();

  const toggleTheme = () => {
    const isDark =
      theme === "dark" ||
      (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    updateProfile({ theme: isDark ? "light" : "dark" });
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border bg-surface sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border lg:hidden"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
            >
              <button onClick={() => setMobileOpen(false)} className="btn-ghost absolute right-3 top-4 p-1.5 z-10"><X size={18} /></button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg/80 backdrop-blur-xl px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2">
            <button className="btn-ghost p-2 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
            <Image src="/logo.png" alt="Trivora" width={469} height={391} className="h-6 w-auto lg:hidden" />
            <span className="lg:hidden font-semibold">Trivora</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
              <Sun size={18} className="hidden dark:block" />
              <Moon size={18} className="dark:hidden" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand text-sm font-semibold">
              {firstName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-border px-4 sm:px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Trivora" width={469} height={391} className="h-4 w-auto opacity-80" />
              <span className="font-medium text-fg">Trivora</span>
              <span className="hidden sm:inline text-faint">·</span>
              <span className="hidden sm:inline text-faint">{t("footer.tagline")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>&copy; {new Date().getFullYear()} Quentin Coulombeaux</span>
              <span className="text-faint">·</span>
              <span>{t("footer.rights")}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
