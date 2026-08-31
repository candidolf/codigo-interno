import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { Download, Loader2, PartyPopper, AlertTriangle } from "lucide-react";
import { fetchReport, generateReport } from "@/lib/report";
import { downloadIdentityCardPdf, downloadReportPdf } from "@/lib/report-pdf";
import { parseReportDocument } from "@/lib/report-schema";

export const Route = createFileRoute("/teste/$id/concluido")({ component: Concluido });

function Concluido() {
  const { id } = Route.useParams();
  const started = useRef(false);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    data: existing,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["test-report", id],
    queryFn: () => fetchReport(id),
    refetchInterval: (query) => (query.state.data?.status === "gerando" ? 3000 : false),
  });

  const run = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateReport(id);
      await refetch();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o relatório.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;
    let hasFinalDocument = false;
    if (existing?.status === "pronto" && existing.content) {
      try {
        parseReportDocument(existing.content);
        hasFinalDocument = true;
      } catch {
        hasFinalDocument = false;
      }
    }
    if (existing?.status === "gerando" || hasFinalDocument) {
      setGenerating(false);
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, existing]);

  const pdfOptions = existing?.content
    ? { content: existing.content, testandoName: "seu relatório", createdAt: existing.updated_at }
    : null;
  const hasFinalDocument = (() => {
    if (existing?.status !== "pronto" || !existing.content) return false;
    try {
      parseReportDocument(existing.content);
      return true;
    } catch {
      return false;
    }
  })();
  const displayGenerating = isLoading || generating || existing?.status === "gerando";

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-20 max-w-xl text-center">
        <span className="inline-grid place-items-center h-20 w-20 rounded-3xl bg-gradient-brand text-white mx-auto">
          {displayGenerating ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : (
            <PartyPopper className="h-9 w-9" />
          )}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-6">Você concluiu o teste!</h1>
        {displayGenerating && (
          <p className="text-muted-foreground mt-3">
            A IA está preparando o relatório final. Esta tela será atualizada automaticamente.
          </p>
        )}
        {!generating &&
          !error &&
          existing?.status === "pronto" &&
          hasFinalDocument &&
          pdfOptions && (
            <section className="glass rounded-2xl p-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-brand-purple">
                Resultado oficial
              </p>
              <h2 className="font-display text-2xl font-bold mt-3">Seu relatório está pronto</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Seu relatório final está pronto para ser guardado.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <GradientButton
                  onClick={() =>
                    void downloadReportPdf(pdfOptions).catch((caught: unknown) => {
                      console.error("Falha ao criar PDF final", caught);
                      toast.error("Não foi possível baixar o PDF do relatório.");
                    })
                  }
                >
                  <Download className="h-4 w-4" /> Baixar relatório final
                </GradientButton>
                <Button
                  variant="outline"
                  onClick={() =>
                    void downloadIdentityCardPdf(pdfOptions).catch((caught: unknown) => {
                      console.error("Falha ao criar card de identidade", caught);
                      toast.error("Não foi possível baixar o card.");
                    })
                  }
                >
                  <Download className="h-4 w-4" /> Baixar somente o card
                </Button>
              </div>
            </section>
          )}
        {!generating && !error && existing?.status === "pronto" && !hasFinalDocument && (
          <section className="glass rounded-2xl p-6 mt-8 text-left border border-destructive/40">
            <p className="font-semibold text-destructive">
              O relatório não ficou válido após a regeneração.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Tente gerar novamente para criar o relatório final.
            </p>
            <GradientButton className="mt-5" onClick={() => void run()} disabled={generating}>
              Tentar novamente
            </GradientButton>
          </section>
        )}
        {!generating && !error && existing?.status === "erro" && (
          <section className="glass rounded-2xl p-6 mt-8 text-left border border-destructive/40">
            <p className="font-semibold text-destructive">A geração do relatório falhou.</p>
            {existing.error && (
              <p className="text-sm text-muted-foreground mt-2 break-words">{existing.error}</p>
            )}
            <GradientButton className="mt-5" onClick={() => void run()} disabled={generating}>
              Tentar novamente
            </GradientButton>
          </section>
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
          <Button variant="ghost" asChild className="cursor-pointer">
            <Link to="/dashboard">Voltar ao painel</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
