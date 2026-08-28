import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchReport, generateReport } from "@/lib/report";
import { openReportPdf } from "@/lib/report-pdf";
import { ExternalLink, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/relatorio/$id")({
  component: Relatorio,
  head: () => ({
    meta: [
      { title: "Relatório da análise emocional | Código Interno" },
      {
        name: "description",
        content:
          "Relatório completo gerado por IA a partir das respostas das salas do teste do Código Interno.",
      },
      { property: "og:title", content: "Relatório da análise emocional" },
      {
        property: "og:description",
        content: "Veja e baixe em PDF o relatório gerado pela IA a partir das suas respostas.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Relatorio() {
  const { id } = Route.useParams();
  const [regenerating, setRegenerating] = useState(false);

  const { data: purchase } = useQuery({
    queryKey: ["purchase-basic", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_purchases")
        .select("id, testando_name")
        .eq("id", id)
        .maybeSingle();
      return data as { id: string; testando_name: string | null } | null;
    },
  });

  const {
    data: report,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["test-report", id],
    queryFn: () => fetchReport(id),
    refetchInterval: (query) => (query.state.data?.status === "gerando" ? 3000 : false),
  });

  const testandoName = purchase?.testando_name ?? "Testando";
  const pdfOptions = report?.content
    ? { content: report.content, testandoName, createdAt: report.updated_at }
    : null;

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await generateReport(id);
      await refetch();
      toast.success("Geração iniciada. Você pode permanecer nesta página ou voltar depois.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o relatório");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Relatório</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
              Revelações por sala
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{testandoName}</p>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground mt-10">Carregando relatório…</p>}

        {!isLoading && report?.status === "gerando" && (
          <section className="glass rounded-2xl p-6 mt-8">
            <p className="flex items-center gap-2 font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />A IA está preparando o
              relatório
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A geração continua em segundo plano. Esta página atualiza automaticamente e você
              também pode voltar mais tarde.
            </p>
          </section>
        )}

        {!isLoading && (!report || report.status === "erro") && (
          <section className="glass rounded-2xl p-6 mt-8">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-brand-orange" />
              {report?.status === "erro"
                ? "O relatório não pôde ser gerado"
                : "Relatório ainda não gerado"}
            </p>
            {report?.error && (
              <p className="text-sm text-muted-foreground mt-2 break-words">{report.error}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <GradientButton onClick={() => void regenerate()} disabled={regenerating}>
                {regenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                {regenerating ? "Gerando…" : "Gerar relatório agora"}
              </GradientButton>
              <Button variant="ghost" asChild className="cursor-pointer">
                <Link to="/dashboard">Voltar ao painel</Link>
              </Button>
            </div>
          </section>
        )}

        {report?.status === "pronto" && pdfOptions && (
          <>
            <section className="glass rounded-2xl p-8 sm:p-12 mt-8 text-center">
              <p className="text-xs uppercase tracking-widest text-brand-purple">Resultado oficial</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-3">
                Seu relatório está pronto
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
                Abra a sua jornada completa ou baixe o PDF para guardar e compartilhar.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <GradientButton
                  onClick={() =>
                    void openReportPdf(pdfOptions).catch(() =>
                      toast.error("Não foi possível abrir o PDF do relatório"),
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir ou baixar relatório oficial
                </GradientButton>
              </div>
            </section>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => void regenerate()}
                disabled={regenerating}
              >
                {regenerating ? "Gerando…" : "Gerar novamente"}
              </Button>
              <Button variant="ghost" asChild className="cursor-pointer">
                <Link to="/dashboard">Voltar ao painel</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
