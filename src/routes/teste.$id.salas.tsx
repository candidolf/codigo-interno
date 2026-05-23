import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { RoomCard } from "@/components/brand/RoomCard";
import { GradientButton } from "@/components/brand/GradientButton";
import { rooms } from "@/data/mock";

export const Route = createFileRoute("/teste/$id/salas")({ component: Salas });

const testandoAge = 11; // mock
const progressBySlug: Record<string, number> = { alegria: 100, medo: 60, raiva: 0, descobertas: 0 };

function Salas() {
  const { id } = Route.useParams();
  const eligible = rooms.filter((r) => testandoAge >= r.ageMin && testandoAge <= r.ageMax);
  const allDone = eligible.every((r) => (progressBySlug[r.slug] ?? 0) === 100);
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
        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {eligible.map((r) => (
            <RoomCard key={r.slug} room={r} testId={id} progress={progressBySlug[r.slug] ?? 0} />
          ))}
        </div>
      </main>
    </div>
  );
}
