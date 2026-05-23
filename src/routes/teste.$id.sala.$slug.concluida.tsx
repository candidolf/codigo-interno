import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import { questions as allQuestions, rooms, themeStyle } from "@/data/mock";
import { allRoomsCompleted, loadProgress } from "@/lib/test-progress";

export const Route = createFileRoute("/teste/$id/sala/$slug/concluida")({ component: SalaConcluida });

function SalaConcluida() {
  const { id, slug } = Route.useParams();
  const room = rooms.find((r) => r.slug === slug);
  const state = loadProgress(id);
  const roomState = state.rooms[slug];
  const qs = allQuestions.filter((q) => q.roomSlug === slug);
  if (!room) return <div className="p-10">Sala não encontrada.</div>;
  const s = themeStyle(room.theme);

  const dist: Record<string, number> = {};
  for (const ans of Object.values(roomState?.answers ?? {})) {
    dist[ans] = (dist[ans] ?? 0) + 1;
  }
  const total = qs.length;
  const top = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];

  const allDone = allRoomsCompleted(state, rooms.map((r) => r.slug));

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-2xl text-center">
        <span className="inline-grid place-items-center h-20 w-20 rounded-3xl bg-gradient-brand text-white mx-auto">
          <PartyPopper className="h-9 w-9" />
        </span>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-6">Sala concluída</p>
        <h1 className={`font-display text-4xl font-bold mt-2 ${s.text}`}>{s.emoji} {room.title}</h1>
        <p className="text-muted-foreground mt-3">Parabéns! Você concluiu esta sala.</p>

        <div className="glass rounded-2xl p-6 mt-8 text-left">
          <h2 className="font-display font-bold text-lg">Resumo da sala</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {total} perguntas respondidas.
          </p>
          {top && (
            <p className="text-sm mt-3">
              Tendência predominante: <span className="font-semibold">resposta "{top[0]}"</span> em {top[1]} de {total} perguntas.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4 italic">
            * O resumo detalhado será gerado pela IA na próxima fase.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {allDone ? (
            <GradientButton asChild>
              <Link to="/teste/$id/concluido" params={{ id }}>Ver relatório final</Link>
            </GradientButton>
          ) : (
            <GradientButton asChild>
              <Link to="/teste/$id/salas" params={{ id }}>Próxima sala</Link>
            </GradientButton>
          )}
          <Button variant="outline" asChild>
            <Link to="/teste/$id/salas" params={{ id }}>Voltar ao mapa</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}