import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, PartyPopper } from "lucide-react";
import { themeStyle } from "@/data/mock";
import { fetchRoomsWithQuestions } from "@/lib/rooms-data";
import { allRoomsCompleted, loadProgress } from "@/lib/test-progress";
import { fetchRoomReport, generateRoomReport, parseRoomReport } from "@/lib/room-reports";
import { RoomReportView } from "@/components/brand/RoomReportView";

export const Route = createFileRoute("/teste/$id/sala-concluida/$slug")({
  component: SalaConcluida,
});

function SalaConcluida() {
  const { id, slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["rooms-with-questions"],
    staleTime: 5 * 60_000,
    queryFn: fetchRoomsWithQuestions,
  });
  const rooms = data?.rooms ?? [];
  const allQuestions = data?.questions ?? [];
  const room = rooms.find((r) => r.slug === slug);
  const state = loadProgress(id);
  const roomState = state.rooms[slug];
  const qs = allQuestions.filter((q) => q.roomSlug === slug);
  const withQuestions = rooms.filter((r) => allQuestions.some((q) => q.roomSlug === r.slug));
  const started = useRef(false);
  const [roomReport, setRoomReport] = useState<Awaited<ReturnType<typeof fetchRoomReport>>>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatingRoomReport, setGeneratingRoomReport] = useState(false);

  const total = qs.length;

  const allDone = allRoomsCompleted(
    state,
    withQuestions.map((r) => r.slug),
  );

  const runRoomReport = async () => {
    setGeneratingRoomReport(true);
    setReportError(null);
    try {
      const current = await fetchRoomReport(id, slug);
      if (current?.status === "pronto" && parseRoomReport(current.content)) {
        setRoomReport(current);
        return;
      }
      const result = await generateRoomReport(id, slug);
      if (!result.report?.content || !parseRoomReport(result.report.content)) {
        throw new Error("A revelação retornada não está no formato esperado.");
      }
      setRoomReport(result.report);
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : "Não foi possível gerar a revelação.",
      );
    } finally {
      setGeneratingRoomReport(false);
    }
  };

  useEffect(() => {
    if (!roomState?.completedAt || started.current) return;
    started.current = true;
    void runRoomReport();
    // A conclusão da sala inicia uma única geração; retentativas são explícitas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, roomState?.completedAt]);

  if (isLoading) return <div className="p-10 text-muted-foreground">Carregando…</div>;
  if (!room) return <div className="p-10">Sala não encontrada.</div>;
  const s = themeStyle(room.theme);
  const parsedRoomReport = parseRoomReport(roomReport?.content ?? null);

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 sm:py-12">
        <span className="mx-auto inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-white">
          <PartyPopper className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
          Sala concluída
        </p>
        <h1 className={`mt-2 font-display text-3xl font-bold sm:text-4xl ${s.text}`}>
          {s.emoji} {room.title}
        </h1>
        <p className="text-muted-foreground mt-3">Parabéns! Você concluiu esta sala.</p>

        {parsedRoomReport ? (
          <div className="mt-8 text-left">
            <RoomReportView
              report={parsedRoomReport}
              theme={room.theme}
              roomNumber={withQuestions.findIndex((r) => r.slug === slug) + 1}
              totalRooms={withQuestions.length}
            />
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 mt-8 text-left">
            <h2 className="font-display font-bold text-lg">Resumo da sala</h2>
            <p className="text-sm text-muted-foreground mt-2">{total} perguntas respondidas.</p>
            {reportError ? (
              <div className="mt-4">
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{reportError}</span>
                </p>
                <Button className="mt-4" variant="outline" onClick={() => void runRoomReport()}>
                  Tentar gerar a revelação novamente
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando sua revelação personalizada…
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {generatingRoomReport ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 animate-spin" /> Aguarde a revelação
            </Button>
          ) : allDone ? (
            <GradientButton asChild>
              <Link to="/teste/$id/concluido" params={{ id }}>
                Ver relatório final
              </Link>
            </GradientButton>
          ) : (
            <GradientButton asChild>
              <Link to="/teste/$id/salas" params={{ id }}>
                Próxima sala
              </Link>
            </GradientButton>
          )}
          <Button variant="outline" asChild>
            <Link to="/teste/$id/salas" params={{ id }}>
              Voltar ao mapa
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
