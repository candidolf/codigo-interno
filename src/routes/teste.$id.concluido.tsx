import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { PartyPopper } from "lucide-react";

export const Route = createFileRoute("/teste/$id/concluido")({ component: Concluido });

function Concluido() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-20 max-w-xl text-center">
        <span className="inline-grid place-items-center h-20 w-20 rounded-3xl bg-gradient-brand text-white mx-auto">
          <PartyPopper className="h-9 w-9" />
        </span>
        <h1 className="font-display text-4xl font-bold mt-6">Você concluiu o teste!</h1>
        <p className="text-muted-foreground mt-3">A IA está analisando suas respostas. O relatório completo ficará pronto em alguns instantes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <GradientButton asChild><Link to="/relatorio/$id" params={{ id }}>Ver relatório</Link></GradientButton>
          <Link to="/dashboard" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Voltar ao painel</Link>
        </div>
      </main>
    </div>
  );
}
