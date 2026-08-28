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
import { Copy, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pagamento/$id")({
  component: Pagamento,
  validateSearch: (search: Record<string, unknown>): { destinatario?: "eu" | "outro" } => {
    if (search.destinatario === "outro") return { destinatario: "outro" };
    if (search.destinatario === "eu") return { destinatario: "eu" };
    return {};
  },
});

const PAID = new Set(["pago", "em_andamento", "concluido", "aguardando_convidado"]);
const TERMINAL = new Set(["cancelado"]);

function Pagamento() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getPaymentDetails);
  const assign = useServerFn(assignSelf);
  const queryClient = useQueryClient();
  const [routing, setRouting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copying, setCopying] = useState(false);

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
    refetchInterval: (q) =>
      q.state.data &&
      (PAID.has(q.state.data.purchaseStatus) || TERMINAL.has(q.state.data.purchaseStatus))
        ? false
        : 4000,
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
        toast.info(
          "Pagamento ainda não confirmado pelo PagBank. Tente novamente em alguns segundos.",
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  }

  async function handleCopyPix() {
    if (!data?.pixCopyPaste || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(data.pixCopyPaste);
      toast.success("Código PIX copiado");
    } catch {
      toast.error("Não foi possível copiar o código PIX");
    } finally {
      setCopying(false);
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
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Falha ao liberar teste");
        setRouting(false);
      }
    })();
  }, [data, destinatario, id, navigate, assign, routing]);

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          {data && PAID.has(data.purchaseStatus)
            ? "Pagamento confirmado"
            : data && TERMINAL.has(data.purchaseStatus)
              ? "Pagamento não aprovado"
              : "Processando pagamento"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Estamos confirmando sua compra e liberamos o teste automaticamente em seguida.
        </p>

        {!data && (
          <div className="glass rounded-2xl p-8 mt-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando detalhes...
          </div>
        )}

        {data && !PAID.has(data.purchaseStatus) && !TERMINAL.has(data.purchaseStatus) && (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            {data.pixCopyPaste ? (
              <>
                <h2 className="font-display text-xl font-semibold">Pague com PIX</h2>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie o código abaixo no aplicativo do seu banco.
                </p>
                {data.pixQrCode && (
                  <div className="flex justify-center rounded-xl bg-white p-4">
                    <img src={data.pixQrCode} alt="QR Code PIX PagBank" className="h-56 w-56" />
                  </div>
                )}
                <div className="rounded-xl border border-border bg-background/60 p-3 text-xs break-all select-all">
                  {data.pixCopyPaste}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold">Aguardando confirmação</h2>
                <p className="text-sm text-muted-foreground">
                  A cobrança PIX está sendo gerada. Use o botão abaixo para verificar o status.
                </p>
              </>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              {data.pixCopyPaste && (
                <GradientButton
                  type="button"
                  onClick={handleCopyPix}
                  disabled={copying}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar código PIX
                </GradientButton>
              )}
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
                <Loader2 className="h-4 w-4 animate-spin" /> Atualizamos esta página automaticamente
                assim que o pagamento for confirmado.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {data && PAID.has(data.purchaseStatus) && (
          <Alert className="mt-8">
            <AlertDescription>Pagamento confirmado! Redirecionando...</AlertDescription>
          </Alert>
        )}

        {data && TERMINAL.has(data.purchaseStatus) && (
          <div className="mt-8 space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                A cobrança não foi aprovada ou foi cancelada. Nenhum valor foi confirmado.
              </AlertDescription>
            </Alert>
            <Button type="button" onClick={() => navigate({ to: "/comprar" })}>
              Tentar novamente
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
