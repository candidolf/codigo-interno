import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getPaymentDetails, assignSelf } from "@/lib/purchases.functions";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pagamento/$id")({
  component: Pagamento,
  validateSearch: (search: Record<string, unknown>): { destinatario?: "eu" | "outro" } => {
    if (search.destinatario === "outro") return { destinatario: "outro" };
    if (search.destinatario === "eu") return { destinatario: "eu" };
    return {};
  },
});

const PAID = new Set(["pago", "em_andamento", "concluido", "aguardando_convidado"]);

function Pagamento() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getPaymentDetails);
  const assign = useServerFn(assignSelf);
  const queryClient = useQueryClient();
  const [routing, setRouting] = useState(false);
  const [checking, setChecking] = useState(false);

  // Recupera destinatário: 1) querystring, 2) sessionStorage salvo no checkout, 3) fallback "eu".
  const [destinatario, setDestinatario] = useState<"eu" | "outro">(() => {
    if (search.destinatario) return search.destinatario;
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`purchase:${id}:dest`);
      if (saved === "outro") return "outro";
    }
    return "eu";
  });
  useEffect(() => {
    if (search.destinatario) setDestinatario(search.destinatario);
  }, [search.destinatario]);

  const { data } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => fetchDetails({ data: { purchaseId: id } }),
    refetchInterval: (q) => (q.state.data && PAID.has(q.state.data.purchaseStatus) ? false : 4000),
  });

  async function handleCheckNow() {
    if (checking) return;
    setChecking(true);
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: ["payment", id],
        queryFn: () => fetchDetails({ data: { purchaseId: id } }),
      });
      if (!PAID.has(fresh.purchaseStatus)) {
        toast.info("Pagamento ainda não confirmado pelo Asaas. Tente novamente em alguns segundos.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!data || routing) return;
    if (!PAID.has(data.purchaseStatus)) return;
    setRouting(true);
    (async () => {
      try {
        if (destinatario === "eu") {
          await assign({ data: { purchaseId: id } });
          navigate({ to: "/teste/$id/intro", params: { id } });
        } else {
          navigate({ to: "/testes/$id/destinatario", params: { id } });
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao liberar teste");
        setRouting(false);
      }
    })();
  }, [data, destinatario, id, navigate, assign, routing]);

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Aguardando pagamento</h1>
        <p className="text-muted-foreground mt-2">
          A fatura foi aberta em uma nova aba. Conclua o pagamento por lá — liberamos seu teste automaticamente assim que o ASAAS confirmar.
        </p>

        {!data && (
          <div className="glass rounded-2xl p-8 mt-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando detalhes...
          </div>
        )}

        {data && !PAID.has(data.purchaseStatus) && data.invoiceUrl && (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold">Fechou a aba da fatura?</h2>
            <p className="text-sm text-muted-foreground">
              Sem problema. Clique abaixo para reabrir a fatura em uma nova aba. PIX, cartão e boleto estão disponíveis na mesma tela.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <GradientButton asChild className="cursor-pointer w-full sm:w-auto">
                <a href={data.invoiceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir fatura
                </a>
              </GradientButton>
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckNow}
                disabled={checking}
                className="cursor-pointer w-full sm:w-auto"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Já paguei, verificar agora
              </Button>
            </div>
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Atualizamos esta página automaticamente assim que o pagamento for confirmado.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {data && PAID.has(data.purchaseStatus) && (
          <Alert className="mt-8">
            <AlertDescription>Pagamento confirmado! Redirecionando...</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}