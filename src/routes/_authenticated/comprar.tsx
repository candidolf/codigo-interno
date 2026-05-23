import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { createPurchase } from "@/lib/purchases.functions";
import { assignSelf } from "@/lib/purchases.functions";

export const Route = createFileRoute("/_authenticated/comprar")({
  component: Comprar,
  validateSearch: (search: Record<string, unknown>) => ({
    destinatario: (search.destinatario === "outro" ? "outro" : "eu") as "eu" | "outro",
  }),
});

function Comprar() {
  const navigate = useNavigate();
  const { destinatario: initialDest } = Route.useSearch();
  const buy = useServerFn(createPurchase);
  const assign = useServerFn(assignSelf);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [destinatario, setDestinatario] = useState<"eu" | "outro">(initialDest);
  const [sellerCode, setSellerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await buy({ data: { paymentMethod: method, sellerCode: sellerCode || null } });
      if (res.simulated) {
        toast.success("Pagamento simulado aprovado", {
          description: "Mercado Pago ainda não configurado — compra liberada para teste.",
        });
        if (destinatario === "eu") {
          await assign({ data: { purchaseId: res.purchaseId } });
          navigate({ to: "/teste/$id/intro", params: { id: res.purchaseId } });
        } else {
          navigate({ to: "/testes/$id/destinatario", params: { id: res.purchaseId } });
        }
      } else if (res.initPoint) {
        window.location.href = res.initPoint;
      } else {
        navigate({ to: "/comprar/retorno", search: { purchase: res.purchaseId } as any });
      }
    } catch (err: any) {
      setError(err?.message ?? "Falha ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold">Comprar teste</h1>
        <p className="text-muted-foreground mt-2">Pagamento único, libera 1 teste para você ou para presentear.</p>

        <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 glass rounded-2xl p-6 space-y-5">
            <div>
              <Label className="mb-3 block">Forma de pagamento</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as "pix" | "card")} className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="pix" /> <span>PIX</span>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="card" /> <span>Cartão</span>
                </label>
              </RadioGroup>
            </div>
            {method === "card" && (
              <>
                <div className="space-y-2"><Label>Número do cartão</Label><Input placeholder="0000 0000 0000 0000" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Validade</Label><Input placeholder="MM/AA" /></div>
                  <div className="space-y-2"><Label>CVV</Label><Input placeholder="123" /></div>
                </div>
              </>
            )}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center gap-2">
                Código do vendedor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input value={sellerCode} onChange={(e) => setSellerCode(e.target.value)} placeholder="Ex.: VEND-007" />
              <p className="text-xs text-muted-foreground">Se alguém indicou esta plataforma, informe o código aqui.</p>
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>

          <aside className="glass rounded-2xl p-6 h-fit">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Resumo</p>
            <div className="flex justify-between mt-4">
              <span>1 Teste Código Interno</span>
              <span>R$ 29,90</span>
            </div>
            <div className="border-t border-border my-4" />
            <div className="flex justify-between font-display font-bold text-xl">
              <span>Total</span>
              <span className="text-gradient-brand">R$ 29,90</span>
            </div>
            <GradientButton type="submit" className="w-full mt-6 cursor-pointer" disabled={loading}>
              {loading ? "Processando..." : "Pagar agora"}
            </GradientButton>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Mercado Pago ainda não ativo — pagamento simulado.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}
