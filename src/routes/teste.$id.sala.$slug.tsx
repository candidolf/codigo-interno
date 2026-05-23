import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { QuestionFlow } from "@/components/brand/QuestionFlow";
import { questions, rooms, themeStyle } from "@/data/mock";
import { ArrowLeft } from "lucide-react";
import { loadProgress, startRoom } from "@/lib/test-progress";

export const Route = createFileRoute("/teste/$id/sala/$slug")({ component: Sala });

function Sala() {
  const { id, slug } = Route.useParams();
  const navigate = useNavigate();
  const room = rooms.find((r) => r.slug === slug);
  const qs = questions.filter((q) => q.roomSlug === slug);

  useEffect(() => {
    if (!room) return;
    const state = loadProgress(id);
    const started = state.startedRoom;
    const thisCompleted = Boolean(state.rooms[slug]?.completedAt);
    if (thisCompleted) {
      navigate({ to: "/teste/$id/sala-concluida/$slug", params: { id, slug } });
      return;
    }
    if (started && started !== slug && !thisCompleted) {
      navigate({ to: "/teste/$id/salas", params: { id } });
      return;
    }
    startRoom(id, slug);
  }, [id, slug, room, navigate]);

  if (!room) return <div className="p-10">Sala não encontrada.</div>;
  const s = themeStyle(room.theme);
  const themeBg = { joy: "bg-joy", fear: "bg-fear", anger: "bg-anger", discovery: "bg-discovery" }[room.theme];

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-10">
        <Link to="/teste/$id/salas" params={{ id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao mapa
        </Link>
        <div className="text-center mb-8">
          <span className="text-5xl">{s.emoji}</span>
          <h1 className={`font-display text-3xl font-bold mt-3 ${s.text}`}>{room.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{room.description}</p>
        </div>
        <QuestionFlow questions={qs} testId={id} themeClass={themeBg} roomSlug={slug} />
      </main>
    </div>
  );
}
