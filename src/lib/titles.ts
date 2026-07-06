/** Localize seeded/known session titles. Custom user titles pass through unchanged. */
const KNOWN: Record<string, string> = {
  "Easy run": "title.run.easy",
  "Long run": "title.run.long",
  "Intervals 6x800m": "title.run.intervals",
  "Tempo ride": "title.bike.tempo",
  "Endurance ride": "title.bike.endurance",
  "Long ride 90km": "title.bike.long",
  "Swim set": "title.swim.set",
  "Technique 2000m": "title.swim.technique",
};

export function localizeTitle(
  s: { titleKey?: string; title?: string },
  t: (k: string) => string,
  fallback: string
): string {
  if (s.titleKey) return t(s.titleKey);
  if (s.title && KNOWN[s.title]) return t(KNOWN[s.title]);
  return s.title || fallback;
}
