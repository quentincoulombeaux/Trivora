import { CoachReport } from "./coach";

/**
 * System prompt: le rôle et les garde-fous du coach IA.
 * On force le modèle à ne raisonner QUE sur les chiffres fournis.
 */
export const COACH_SYSTEM_PROMPT = `Tu es un coach de triathlon expérimenté et bienveillant.
Tu réponds en français, de façon concise et concrète.
Règles strictes :
- Base tes conseils UNIQUEMENT sur les métriques fournies ci-dessous. N'invente aucun chiffre.
- Si une donnée manque pour répondre, dis-le clairement plutôt que de supposer.
- Tu ne donnes jamais de conseil médical ; en cas de douleur ou symptôme, renvoie vers un professionnel de santé.
- Explique brièvement le "pourquoi" de chaque recommandation.

Repères pour interpréter les métriques :
- CTL (fitness) = charge chronique sur 42 j ; monte lentement = forme de fond qui progresse.
- ATL (fatigue) = charge aiguë sur 7 j.
- TSB (forme) = CTL - ATL. Positif = frais/affûté ; très négatif (< -30) = fatigue excessive.
- Ramp rate = variation de CTL par semaine ; > 7 = progression trop rapide (risque de blessure).
- Monotonie (Foster) > 2 = entraînement trop uniforme, varier l'intensité.`;

/**
 * Transforme le rapport chiffré (déjà calculé côté app) en un bloc de texte
 * compact et lisible que l'on injecte dans le prompt utilisateur.
 */
export function serializeReport(report: CoachReport): string {
  if (!report.hasData) {
    return "Pas assez de séances récentes (moins de 3 sur les 28 derniers jours) pour une analyse fiable.";
  }
  const lines = [
    `Fitness (CTL, 42j) : ${report.ctl}`,
    `Fatigue (ATL, 7j) : ${report.atl}`,
    `Forme (TSB) : ${report.tsb}`,
    `Ramp rate (CTL/semaine) : ${report.rampRate}`,
    `Charge cette semaine : ${report.weeklyLoad} (semaine précédente : ${report.prevWeeklyLoad})`,
    report.loadDeltaPct != null ? `Variation de charge hebdo : ${report.loadDeltaPct}%` : null,
    report.monotony != null ? `Monotonie (7j) : ${report.monotony}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Construit le message utilisateur final : métriques + question. */
export function buildUserMessage(report: CoachReport, question: string): string {
  return `Voici mes métriques d'entraînement actuelles :\n${serializeReport(report)}\n\nMa question : ${question}`;
}
