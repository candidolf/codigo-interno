import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { User, Gift } from "lucide-react";

export const Route = createFileRoute("/testes/$id/destinatario")({ component: Destinatario });

function Destinatario() {
  const { id } = Route.useParams();
  const [mode, setMode] = useState<"self" | "gift">("self");
  return (
    <div className="min-h-screen">
      <BrandHeader role="master" />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold">Para quem é o teste?</h1>
        <p className="text-muted-foreground mt-2">Compra confirmada. Agora escolha o destinatário.</p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button onClick={() => setMode("self")} className={`text-left p-6 rounded-2xl border-2 transition-all ${mode === "self" ? "border-primary bg-primary/10" : "border-border glass"}`}>
            <User className="h-7 w-7" />
            <h3 className="font-display font-bold text-lg mt-3">Fazer eu mesmo</h3>
            <p className="text-sm text-muted-foreground mt-1">Você é o testando.</p>
          </button>
          <button onClick={() => setMode("gift")} className={`text-left p-6 rounded-2xl border-2 transition-all ${mode === "gift" ? "border-primary bg-primary/10" : "border-border glass"}`}>
            <Gift className="h-7 w-7" />
            <h3 className="font-display font-bold text-lg mt-3">Presentear / delegar</h3>
            <p className="text-sm text-muted-foreground mt-1">Envia link para outra pessoa.</p>
          </button>
        </div>

        {mode === "gift" && (
          <div className="glass rounded-2xl p-6 mt-6 space-y-4">
            <div className="space-y-2"><Label>Nome do testando</Label><Input placeholder="Ex.: Helena" /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Idade</Label><Input type="number" placeholder="11" /></div>
              <div className="space-y-2"><Label>E-mail (opcional)</Label><Input type="email" placeholder="responsavel@..." /></div>
            </div>
            <div className="bg-secondary/40 border border-border rounded-xl p-3 text-sm">
              Link de convite gerado: <code className="text-foreground">/convite/abc123</code>
            </div>
          </div>
        )}

        <div className="mt-8">
          <GradientButton size="lg" asChild>
            <Link to="/teste/$id/intro" params={{ id }}>{mode === "self" ? "Começar agora" : "Enviar convite"}</Link>
          </GradientButton>
        </div>
      </main>
    </div>
  );
}
