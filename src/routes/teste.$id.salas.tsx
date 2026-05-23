import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { RoomCard } from "@/components/brand/RoomCard";
import { GradientButton } from "@/components/brand/GradientButton";
import { rooms, questions as allQuestions } from "@/data/mock";
import { getPurchaseTestando } from "@/lib/purchases.functions";
import { allRoomsCompleted, getRoomProgress, loadProgress, type ProgressState } from "@/lib/test-progress";

export const Route = createFileRoute("/teste/$id/salas")({ component: Salas });

function ageFromBirth(birth: string | null): number {
  if (!birth) return 18;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return 18;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function Salas() {
  const { id } = Route.useParams();
  const fetchTestando = useServerFn(getPurchaseTestando);
  const { data: testando, isLoading } = useQuery({
    queryKey: ["testando", id],
    queryFn: () => fetchTestando({ data: { purchaseId: id } }),
  });

  const [state, setState] = useState<ProgressState>(() => loadProgress(id));
  useEffect(() => { setState(loadProgress(id)); }, [id]);

  const age = testando ? ageFromBirth(testando.birthDate) : 18;
  const eligible = rooms.filter((r) => age >= r.ageMin && age <= r.ageMax);
  const startedRoom = state.startedRoom;
  const allDone = allRoomsCompleted(state, eligible.map((r) => r.slug));
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Mapa da aventura</p>
            <h1 className="font-display text-4xl font-bold mt-1">Escolha uma sala</h1>
          </div>
          {allDone && (
            <GradientButton asChild>
              <Link to="/teste/$id/concluido" params={{ id }}>Finalizar teste</Link>
            </GradientButton>
          )}
        </div>
        {isLoading ? (
          <p className="text-muted-foreground mt-8">Carregando...</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 mt-8">
            {eligible.map((r) => {
              const total = allQuestions.filter((q) => q.roomSlug === r.slug).length;
              const progress = getRoomProgress(state, r.slug, total);
              const locked = Boolean(startedRoom) && startedRoom !== r.slug && !state.rooms[r.slug]?.completedAt;
              return (
                <RoomCard
                  key={r.slug}
                  room={r}
                  testId={id}
                  progress={progress}
                  locked={locked}
                  lockedReason={locked ? "Termine a sala em andamento antes de iniciar outra." : undefined}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
