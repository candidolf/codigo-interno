import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/convite/$token")({ component: Convite });

function Convite() {
  const { token } = Route.useParams();
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-xl text-center">
        <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-gradient-brand text-white mx-auto">
          <Gift className="h-7 w-7" />
        </span>
        <h1 className="font-display text-3xl font-bold mt-6">Você recebeu um teste de presente</h1>
        <p className="text-muted-foreground mt-2">Convite <code className="text-foreground">{token}</code> de Carlos Master.</p>
        <div className="glass rounded-2xl p-6 mt-8 text-left space-y-3">
          <p className="text-sm">Aceite o convite para iniciar sua jornada de autoconhecimento. Não é cobrado nada de você.</p>
        </div>
        <GradientButton size="lg" className="mt-8" asChild>
          <Link to="/teste/$id/intro" params={{ id: "t-003" }}>Aceitar e começar</Link>
        </GradientButton>
      </main>
    </div>
  );
}
