"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AppShell } from "./AppShell";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: the app is fully client-side (localStorage-backed).
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex items-center gap-3 text-muted animate-pulse">
          <Image src="/logo.png" alt="Trivora" width={469} height={391} priority className="h-9 w-auto" />
          <span className="text-sm font-medium">Trivora</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <AppShell>{children}</AppShell>
      </I18nProvider>
    </ThemeProvider>
  );
}
