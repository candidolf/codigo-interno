import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPaymentDetails, assignSelf } from "@/lib/purchases.functions";
import { Copy, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pagamento/$id")({
  component: Pagamento,
  validateSearch: (search: Record<string, unknown>) => ({
    destinatario: (search.destinatario === "outro" ? "outro" : "eu") as "eu" | "outro",
  }),
});

const PAID = new Set(["pago", "em_andamento", "concluido", "aguardando_convidado"]);

function Pagamento() {
  const { id } = Route.useParams();
  const { destinatario } = Route.useSearch();
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getPaymentDetails);
  const assign = useServerFn(assignSelf);
  const [routing, setRouting] = useState(false);

  const { data } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => fetchDetails({ data: { purchaseId: id } }),
    refetchInterval: (q) => (q.state.data && PAID.has(q.state.data.purchaseStatus) ? false : 4000),
  });

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

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Aguardando pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Assim que o pagamento for confirmado, liberamos seu teste automaticamente.
        </p>

        {!data && (
          <div className="glass rounded-2xl p-8 mt-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando detalhes...
          </div>
        )}

        {data?.paymentMethod === "pix" && data.pixQrCode && (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold">Pague com PIX</h2>
            <div className="bg-white rounded-xl p-4 flex justify-center">
              <img
                src={`data:image/png;base64,${data.pixQrCode}`}
                alt="QR Code PIX"
                className="w-56 h-56"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Copia e cola</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={data.pixCopyPaste ?? ""}
                  className="flex-1 bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs font-mono"
                />
                <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => copy(data.pixCopyPaste ?? "")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Aguardando confirmação...
              </AlertDescription>
            </Alert>
          </div>
        )}

        {data?.paymentMethod === "boleto" && data.boletoUrl && (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold">Boleto gerado</h2>
            <p className="text-sm text-muted-foreground">
              Vencimento: {data.dueDate ? new Date(data.dueDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
            </p>
            <GradientButton asChild className="cursor-pointer">
              <a href={data.boletoUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Visualizar boleto
              </a>
            </GradientButton>
            <Alert>
              <AlertDescription>
                Após o pagamento, a compensação pode levar 1 a 2 dias úteis. Esta página atualiza sozinha.
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