import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { ReportContent } from "@/components/brand/ReportContent";
import { supabase } from "@/integrations/supabase/client";
import { fetchReport, generateReport } from "@/lib/report";
import { downloadReportPdf } from "@/lib/report-pdf";
import { Download, AlertTriangle, Loader2 } from "lucide-react";

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

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["test-report", id],
    queryFn: () => fetchReport(id),
  });

  const testandoName = purchase?.testando_name ?? "Testando";

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await generateReport(id);
      await refetch();
      toast.success("Relatório gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar o relatório");
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
              Análise emocional completa
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{testandoName}</p>
          </div>
          {report?.status === "pronto" && report.content && (
            <GradientButton
              onClick={() =>
                downloadReportPdf({
                  content: report.content!,
                  testandoName,
                  createdAt: report.updated_at,
                })
              }
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </GradientButton>
          )}
        </div>

        {isLoading && <p className="text-muted-foreground mt-10">Carregando relatório…</p>}

        {!isLoading && (!report || report.status === "erro" || !report.content) && (
          <section className="glass rounded-2xl p-6 mt-8">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-brand-orange" />
              {report?.status === "erro" ? "O relatório não pôde ser gerado" : "Relatório ainda não gerado"}
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

        {report?.status === "pronto" && report.content && (
          <>
            <section className="glass rounded-2xl p-5 sm:p-8 mt-8">
              <ReportContent content={report.content} />
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
