import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPurchase, validateSellerCode } from "@/lib/purchases.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { maskCpfCnpj, maskPhone, isValidCpfCnpj } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comprar")({
  component: Comprar,
  validateSearch: (search: Record<string, unknown>) => ({
    destinatario: (search.destinatario === "outro" ? "outro" : "eu") as "eu" | "outro",
  }),
});

function Comprar() {
  const { destinatario: initialDest } = Route.useSearch();
  const navigate = useNavigate();
  const buy = useServerFn(createPurchase);
  const fetchProfile = useServerFn(getMyProfile);
  const checkSeller = useServerFn(validateSellerCode);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    staleTime: 60_000,
  });
  const [destinatario, setDestinatario] = useState<"eu" | "outro">(initialDest);
  const [sellerCode, setSellerCode] = useState("");
  const [sellerStatus, setSellerStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

  // Pré-preenche com dados do master (pagador) quando o profile carrega.
  // Só preenche campos ainda vazios — não sobrescreve o que o usuário já digitou.
  useEffect(() => {
    if (!profile) return;
    if (profile.fullName) setFullName((v) => v || profile.fullName!);
    if (profile.cpfCnpj) setCpfCnpj((v) => v || maskCpfCnpj(profile.cpfCnpj!));
    if (profile.phone) setPhone((v) => v || maskPhone(profile.phone!));
  }, [profile]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valida código do vendedor (debounced) quando preenchido. Vazio = ok.
  useEffect(() => {
    const raw = sellerCode.trim();
    if (!raw) {
      setSellerStatus("idle");
      setSellerName(null);
      return;
    }
    setSellerStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await checkSeller({ data: { code: raw } });
        if (res.valid) {
          setSellerStatus("valid");
          setSellerName(res.name ?? null);
        } else {
          setSellerStatus("invalid");
          setSellerName(null);
        }
      } catch {
        setSellerStatus("invalid");
        setSellerName(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [sellerCode, checkSeller]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cpfDigits = cpfCnpj.replace(/\D/g, "");
      const phoneDigits = phone.replace(/\D/g, "");
      if (!fullName.trim()) throw new Error("Informe o nome completo");
      if (!isValidCpfCnpj(cpfDigits)) throw new Error("CPF/CNPJ inválido");
      if (sellerCode.trim() && sellerStatus !== "valid") {
        throw new Error("Código de vendedor inválido. Deixe em branco ou corrija.");
      }

      // Garante que há sessão antes de chamar o server fn. O supabase-js já
      // refresca o token sozinho — não forçamos refresh aqui.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        navigate({ to: "/login", search: { redirect: "/comprar" } as any });
        return;
      }

      const res = await buy({
        data: {
          sellerCode: sellerCode || null,
          fullName: fullName.trim(),
          cpfCnpj: cpfDigits,
          phone: phoneDigits || null,
        },
      });

      // Persiste o destinatário escolhido para usar quando o Asaas redirecionar de volta.
      try {
        sessionStorage.setItem(`purchase:${res.purchaseId}:dest`, destinatario);
      } catch {
        /* noop */
      }

      if (res.invoiceUrl) {
        // Fluxo real: tenta abrir a fatura do Asaas em nova aba e SEMPRE
        // mantém a aba atual na tela de aguardando pagamento (polling +
        // webhook liberam o teste). Se a popup for bloqueada, a tela de
        // pagamento mostra um botão "Abrir fatura" para o usuário abrir
        // manualmente — nunca redirecionamos a aba atual para o Asaas.
        window.open(res.invoiceUrl, "_blank", "noopener,noreferrer");
        navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } });
      } else {
        // Modo simulado (Asaas desligado): segue direto para a tela de pagamento,
        // que detecta status "pago" e libera o teste.
        navigate({ to: "/pagamento/$id", params: { id: res.purchaseId } });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Falha ao processar pagamento.";
      let friendly = msg;
      if (/token de autenticação não foi enviado/i.test(msg)) {
        friendly = "Falha ao autenticar a requisição. Recarregue a página (F5) e tente novamente.";
      } else if (/unauthorized/i.test(msg)) {
        friendly = "Sessão expirada. Saia e entre novamente para continuar.";
      }
      setError(friendly);
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
              <Label className="mb-3 block">Para quem é este teste?</Label>
              <RadioGroup value={destinatario} onValueChange={(v) => setDestinatario(v as "eu" | "outro")} className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="eu" /> <span>Para mim</span>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="outro" /> <span>Para outra pessoa</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome completo do pagador</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como aparece no documento" required />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (opcional)</Label>
                <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 90000-0000" inputMode="tel" />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center gap-2">
                Código do vendedor <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                value={sellerCode}
                onChange={(e) => setSellerCode(e.target.value.toUpperCase())}
                placeholder="Ex.: VEND-007"
              />
              {sellerStatus === "idle" && (
                <p className="text-xs text-muted-foreground">Se alguém indicou esta plataforma, informe o código aqui.</p>
              )}
              {sellerStatus === "checking" && (
                <p className="text-xs text-muted-foreground">Verificando código…</p>
              )}
              {sellerStatus === "valid" && (
                <p className="text-xs text-emerald-500">Vendedor: {sellerName}</p>
              )}
              {sellerStatus === "invalid" && (
                <p className="text-xs text-destructive">Código de vendedor não encontrado.</p>
              )}
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>

          <div className="h-fit space-y-4">
            <aside className="glass rounded-2xl p-6">
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
                {loading ? "Processando..." : "Ir para pagamento"}
              </GradientButton>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Pagamento processado pelo Asaas em ambiente seguro.
              </p>
            </aside>
            <Alert>
              <AlertDescription>
                Você será direcionado a uma página segura do Asaas para escolher entre PIX, cartão de crédito ou boleto. A liberação do teste é automática após a confirmação.
              </AlertDescription>
            </Alert>
          </div>
        </form>
      </main>
    </div>
  );
}
