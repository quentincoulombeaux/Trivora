export type Discipline = "run" | "bike" | "swim";

export type Units = "metric" | "imperial";
export type Language = "en" | "fr";
export type Theme = "light" | "dark" | "system";

export type StrokeType = "freestyle" | "breaststroke" | "backstroke" | "butterfly" | "medley";

export type BlockType =
  | "warmup"
  | "base"
  | "endurance"
  | "tempo"
  | "threshold"
  | "interval"
  | "power"
  | "technique"
  | "recovery"
  | "cooldown"
  | "custom";

export interface SessionBlock {
  id: string;
  type: BlockType;
  /** number of repetitions of this block */
  repeat?: number;
  /** distance in meters */
  distance?: number;
  /** duration in seconds */
  duration?: number;
  /** target pace in seconds per km (run) or seconds per 100m (swim) */
  targetPace?: number;
  /** target power in watts (bike) */
  targetPower?: number;
  note?: string;
}

export interface Session {
  id: string;
  discipline: Discipline;
  date: string; // ISO date (yyyy-mm-dd)
  title?: string;
  /** i18n key for seeded/known titles; resolved at render, falls back to title */
  titleKey?: string;
  /** distance in meters */
  distance: number;
  /** duration in seconds */
  duration: number;
  /** elevation gain in meters (run/bike) */
  elevation?: number;
  avgHr?: number;
  maxHr?: number;
  // cycling
  power?: number; // watts
  cadence?: number; // rpm
  // swimming
  poolLength?: number; // meters
  strokeType?: StrokeType;
  notes?: string;
  /** structured session plan */
  blocks?: SessionBlock[];
  /** RPE 1-10, used for training load */
  rpe?: number;
  /** true when the session is planned (future) and not yet completed */
  planned?: boolean;
  createdAt: string;
}

export type GoalType =
  | "marathon"
  | "half-marathon"
  | "ironman"
  | "half-ironman"
  | "monthly-distance"
  | "weekly-volume"
  | "race";

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  discipline?: Discipline;
  /** target value: meters for distance goals, seconds for time goals */
  target: number;
  /** unit hint for rendering: "distance" | "time" | "count" */
  metric: "distance" | "time" | "count";
  deadline?: string; // ISO date
  createdAt: string;
}

export type Sex = "male" | "female" | "unspecified";

export interface Profile {
  firstName: string;
  lastName: string;
  language: Language;
  units: Units;
  theme: Theme;
  /** body weight in kg */
  weight?: number;
  /** height in cm */
  height?: number;
  age?: number;
  sex?: Sex;
}

export interface PersonalRecord {
  key: string;
  label: string;
  /** i18n key for the label */
  labelKey?: string;
  discipline: Discipline;
  /** value in seconds for time PRs, meters for distance PRs, etc. */
  value: number;
  kind: "time" | "distance" | "speed" | "power";
  sessionId?: string;
  date?: string;
}

export interface AppData {
  profile: Profile;
  sessions: Session[];
  goals: Goal[];
}
