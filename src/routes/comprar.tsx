import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/comprar")({ component: Comprar });

function Comprar() {
  return (
    <div className="min-h-screen">
      <BrandHeader role="master" />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold">Comprar teste</h1>
        <p className="text-muted-foreground mt-2">Pagamento único, libera 1 teste para você ou para presentear.</p>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <form className="md:col-span-2 glass rounded-2xl p-6 space-y-5">
            <div>
              <Label className="mb-3 block">Forma de pagamento</Label>
              <RadioGroup defaultValue="pix" className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="pix" /> <span>PIX</span>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="card" /> <span>Cartão</span>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Número do cartão</Label>
              <Input placeholder="0000 0000 0000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Validade</Label><Input placeholder="MM/AA" /></div>
              <div className="space-y-2"><Label>CVV</Label><Input placeholder="123" /></div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center gap-2">
                Código do vendedor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input placeholder="Ex.: VEND-007" />
              <p className="text-xs text-muted-foreground">Se alguém indicou esta plataforma, informe o código aqui.</p>
            </div>
          </form>

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
            <GradientButton className="w-full mt-6" asChild>
              <Link to="/testes/$id/destinatario" params={{ id: "t-004" }}>Pagar agora</Link>
            </GradientButton>
            <p className="text-xs text-muted-foreground mt-3 text-center">Mockup — nenhuma cobrança real.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
