import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/teste/$id/intro")({ component: Intro });

function Intro() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen">
      <BrandHeader role="user" />
      <main className="container mx-auto px-6 py-20 max-w-2xl text-center">
        <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-gradient-brand text-white mx-auto">
          <Sparkles className="h-7 w-7" />
        </span>
        <h1 className="font-display text-5xl font-bold mt-6 leading-tight">
          Sua <span className="text-gradient-brand">aventura</span> está pronta
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Você vai entrar em salas temáticas. Em cada sala, a IA fará algumas perguntas. Responda do jeito mais sincero que conseguir — não há resposta certa.
        </p>
        <GradientButton size="lg" className="mt-10" asChild>
          <Link to="/teste/$id/salas" params={{ id }}>Começar aventura</Link>
        </GradientButton>
      </main>
    </div>
  );
}
