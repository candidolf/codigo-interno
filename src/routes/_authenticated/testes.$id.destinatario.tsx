import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { User, Gift, Copy } from "lucide-react";
import { assignSelf } from "@/lib/purchases.functions";
import { createInvite } from "@/lib/invites.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/testes/$id/destinatario")({ component: Destinatario });

function Destinatario() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const doAssign = useServerFn(assignSelf);
  const doInvite = useServerFn(createInvite);
  const [mode, setMode] = useState<"self" | "gift">("self");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl = token ? `${window.location.origin}/convite/${token}` : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (mode === "self") {
        await doAssign({ data: { purchaseId: id } });
        navigate({ to: "/teste/$id/intro", params: { id } });
      } else {
        if (!name.trim()) { setError("Informe o nome do testando."); setLoading(false); return; }
        const res = await doInvite({ data: { purchaseId: id, testandoName: name, testandoEmail: email || null } });
        setToken(res.token);
        toast.success("Convite criado", { description: "Copie o link e envie ao convidado." });
      }
    } catch (err: any) {
      setError(err?.message ?? "Falha ao processar.");
    } finally { setLoading(false); }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold">Para quem é o teste?</h1>
        <p className="text-muted-foreground mt-2">Compra confirmada. Agora escolha o destinatário.</p>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <button type="button" onClick={() => { setMode("self"); setToken(null); }} className={`cursor-pointer text-left p-6 rounded-2xl border-2 transition-all ${mode === "self" ? "border-primary bg-primary/10" : "border-border glass"}`}>
            <User className="h-7 w-7" />
            <h3 className="font-display font-bold text-lg mt-3">Fazer eu mesmo</h3>
            <p className="text-sm text-muted-foreground mt-1">Você é o testando.</p>
          </button>
          <button type="button" onClick={() => setMode("gift")} className={`cursor-pointer text-left p-6 rounded-2xl border-2 transition-all ${mode === "gift" ? "border-primary bg-primary/10" : "border-border glass"}`}>
            <Gift className="h-7 w-7" />
            <h3 className="font-display font-bold text-lg mt-3">Presentear / delegar</h3>
            <p className="text-sm text-muted-foreground mt-1">Envia link para outra pessoa.</p>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "gift" && (
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="space-y-2"><Label>Nome do testando</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Helena" /></div>
              <div className="space-y-2"><Label>E-mail (opcional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="responsavel@..." /></div>
              {inviteUrl && (
                <div className="bg-secondary/40 border border-border rounded-xl p-3 text-sm flex items-center gap-2 justify-between">
                  <code className="text-foreground text-xs break-all">{inviteUrl}</code>
                  <button type="button" onClick={copy} className="cursor-pointer p-2 hover:bg-secondary rounded"><Copy className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          )}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <GradientButton type="submit" size="lg" disabled={loading} className="cursor-pointer">
            {loading ? "..." : mode === "self" ? "Começar agora" : (token ? "Gerar outro link" : "Gerar link de convite")}
          </GradientButton>
        </form>
      </main>
    </div>
  );
}
