"use client";

import React, { createContext, useCallback, useContext } from "react";
import { useStore } from "../store";
import { Language } from "../types";
import { dictionaries } from "./dictionaries";

interface I18nCtx {
  lang: Language;
  t: (key: string) => string;
  setLang: (l: Language) => void;
}

const Ctx = createContext<I18nCtx>({ lang: "en", t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useStore((s) => s.profile.language);
  const updateProfile = useStore((s) => s.updateProfile);

  const t = useCallback(
    (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang]
  );
  const setLang = useCallback((l: Language) => updateProfile({ language: l }), [updateProfile]);

  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
