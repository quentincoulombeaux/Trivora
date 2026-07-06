"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppData, Goal, Profile, Session } from "./types";
import { isoDate } from "./calc";
import { buildSampleGoals, buildSampleSessions, defaultProfile } from "./sampleData";

interface StoreState extends AppData {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  // profile
  updateProfile: (p: Partial<Profile>) => void;
  // sessions
  addSession: (s: Omit<Session, "id" | "createdAt">) => Session;
  updateSession: (id: string, s: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  // goals
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, g: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  // backup
  exportData: () => AppData;
  importData: (data: AppData) => void;
  resetWithSamples: () => void;
  clearAll: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      sessions: buildSampleSessions(),
      goals: buildSampleGoals(),
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      addSession: (data) => {
        const session: Session = { ...data, id: uid(), createdAt: isoDate(new Date()) };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        return session;
      },
      updateSession: (id, data) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...data } : x)) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      addGoal: (g) =>
        set((s) => ({
          goals: [...s.goals, { ...g, id: uid(), createdAt: isoDate(new Date()) }],
        })),
      updateGoal: (id, g) =>
        set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...g } : x)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((x) => x.id !== id) })),

      exportData: () => {
        const { profile, sessions, goals } = get();
        return { profile, sessions, goals };
      },
      importData: (data) =>
        set(() => ({
          profile: data.profile ?? defaultProfile,
          sessions: data.sessions ?? [],
          goals: data.goals ?? [],
        })),
      resetWithSamples: () =>
        set(() => ({ profile: defaultProfile, sessions: buildSampleSessions(), goals: buildSampleGoals() })),
      clearAll: () => set(() => ({ sessions: [], goals: [] })),
    }),
    {
      name: "trivora-data-v1",
      partialize: (s) => ({ profile: s.profile, sessions: s.sessions, goals: s.goals }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
