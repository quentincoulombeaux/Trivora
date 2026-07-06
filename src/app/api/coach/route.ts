import { NextRequest } from "next/server";
import { COACH_SYSTEM_PROMPT, buildUserMessage } from "@/lib/coachPrompt";
import type { CoachReport } from "@/lib/coach";

// Cette route doit tourner côté serveur Node (elle parle à Ollama en localhost).
export const runtime = "nodejs";
// Pas de cache : chaque question est unique.
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

export async function POST(req: NextRequest) {
  let body: { question?: string; report?: CoachReport };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const { question, report } = body;
  if (!question || !report) {
    return Response.json({ error: "Champs 'question' et 'report' requis." }, { status: 400 });
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: { temperature: 0.4 },
        messages: [
          { role: "system", content: COACH_SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(report, question) },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return Response.json(
        { error: `Ollama a renvoyé une erreur (${res.status}). Le serveur Ollama tourne-t-il ?`, detail: txt },
        { status: 502 },
      );
    }

    const data = await res.json();
    return Response.json({ answer: data?.message?.content ?? "" });
  } catch (e) {
    return Response.json(
      { error: "Impossible de joindre Ollama. Vérifie qu'il tourne (commande : ollama serve).", detail: String(e) },
      { status: 502 },
    );
  }
}
