import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Question } from "@/data/mock";
import { GradientButton } from "./GradientButton";
import { cn } from "@/lib/utils";
import { completeRoom, loadProgress, saveAnswer } from "@/lib/test-progress";

export function QuestionFlow({
  questions,
  testId,
  themeClass,
  roomSlug,
}: {
  questions: Question[];
  testId: string;
  themeClass: string;
  roomSlug: string;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [showOther, setShowOther] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const state = loadProgress(testId);
    const room = state.rooms[roomSlug];
    if (!room) return;
    const firstUnanswered = questions.findIndex((q) => !(q.id in room.answers));
    if (firstUnanswered > 0) setIdx(firstUnanswered);
  }, [testId, roomSlug, questions]);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const progress = Math.round(((idx + 1) / questions.length) * 100);

  const next = () => {
    if (!picked) return;
    saveAnswer(testId, roomSlug, q.id, picked, picked === "other" ? other : undefined);
    setPicked(null);
    setOther("");
    setShowOther(false);
    if (isLast) {
      completeRoom(testId, roomSlug);
      navigate({ to: "/teste/$id/sala/$slug/concluida", params: { id: testId, slug: roomSlug } });
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>Pergunta {idx + 1} de {questions.length}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-8">
        <div className={cn("h-full transition-all", themeClass)} style={{ width: `${progress}%` }} />
      </div>

      <div key={q.id} className="glass rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">A IA pergunta</p>
        <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">{q.text}</h2>

        <div className="grid sm:grid-cols-2 gap-3 mt-8">
          {q.answers.map((a) => (
            <button
              key={a.id}
              onClick={() => { setPicked(a.id); setShowOther(false); }}
              className={cn(
                "text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3",
                picked === a.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/40 hover:border-primary/50",
              )}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-sm font-medium pt-1">{a.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setShowOther(true); setPicked("other"); }}
          className={cn(
            "mt-3 w-full text-left p-4 rounded-2xl border-2 transition-all",
            picked === "other" ? "border-primary bg-primary/10" : "border-dashed border-border hover:border-primary/50",
          )}
        >
          <span className="text-sm font-medium">✍️ Outros — escrever minha resposta</span>
        </button>
        {showOther && (
          <textarea
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Conte com suas palavras..."
            className="mt-3 w-full bg-secondary/40 border border-border rounded-xl p-3 text-sm min-h-24 focus:outline-none focus:border-primary"
          />
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ← Anterior
          </button>
          <GradientButton size="lg" onClick={next} disabled={!picked || (picked === "other" && !other.trim())}>
            {isLast ? "Concluir sala" : "Próxima"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
