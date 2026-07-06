"use client";

import { useMemo, useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { coachReport } from "@/lib/coach";
import { Card, CardHeader } from "@/components/ui";

export default function CoachChat() {
  const sessions = useStore((s) => s.sessions);
  const report = useMemo(() => coachReport(sessions), [sessions]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, report }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur inconnue");
      setAnswer(data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Demander au coach IA" />
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
          placeholder="Ex : puis-je faire une grosse sortie vélo demain ?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button
          onClick={ask}
          disabled={loading}
          className="flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Envoyer
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {answer && (
        <div className="mt-4 flex gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
        </div>
      )}
    </Card>
  );
}
