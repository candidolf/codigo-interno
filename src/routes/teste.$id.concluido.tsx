import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, AlertTriangle } from "lucide-react";
import { fetchReport, generateReport } from "@/lib/report";

export const Route = createFileRoute("/teste/$id/concluido")({ component: Concluido });

function Concluido() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["test-report", id],
    queryFn: () => fetchReport(id),
  });

  const run = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateReport(id);
      navigate({ to: "/relatorio/$id", params: { id } });
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível gerar o relatório.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    if (existing?.status === "pronto" && existing.content) {
      setGenerating(false);
      navigate({ to: "/relatorio/$id", params: { id } });
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, existing]);

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-20 max-w-xl text-center">
        <span className="inline-grid place-items-center h-20 w-20 rounded-3xl bg-gradient-brand text-white mx-auto">
          {generating ? <Loader2 className="h-9 w-9 animate-spin" /> : <PartyPopper className="h-9 w-9" />}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-6">Você concluiu o teste!</h1>
        {generating && (
          <p className="text-muted-foreground mt-3">
            A IA está analisando suas respostas e montando o relatório. Isso leva alguns instantes…
          </p>
        )}
        {error && (
          <div className="glass rounded-2xl p-5 mt-6 text-left border border-destructive/40">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" /> Falha ao gerar o relatório
            </p>
            <p className="text-sm text-muted-foreground mt-2 break-words">{error}</p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {error && (
            <GradientButton onClick={() => void run()} disabled={generating}>
              Tentar novamente
            </GradientButton>
          )}
          {!generating && !error && (
            <GradientButton asChild>
              <Link to="/relatorio/$id" params={{ id }}>Ver relatório</Link>
            </GradientButton>
          )}
          <Button variant="ghost" asChild className="cursor-pointer">
            <Link to="/dashboard">Voltar ao painel</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
