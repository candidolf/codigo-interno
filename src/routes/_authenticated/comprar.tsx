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
import { toast } from "sonner";
import { createPurchase } from "@/lib/purchases.functions";
import { assignSelf } from "@/lib/purchases.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { maskCpfCnpj, maskPhone, isValidCpfCnpj } from "@/lib/masks";

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
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    staleTime: 60_000,
  });
  const [method, setMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [destinatario, setDestinatario] = useState<"eu" | "outro">(initialDest);
  const [sellerCode, setSellerCode] = useState("");
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
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderCpf, setCardHolderCpf] = useState("");
  const [cardCep, setCardCep] = useState("");
  const [cardAddrNumber, setCardAddrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cpfDigits = cpfCnpj.replace(/\D/g, "");
      const phoneDigits = phone.replace(/\D/g, "");
      if (!fullName.trim()) throw new Error("Informe o nome completo");
      if (!isValidCpfCnpj(cpfDigits)) throw new Error("CPF/CNPJ inválido");
      const [expMonth, expYearShort] = cardExpiry.split("/");

      const res = await buy({
        data: {
          paymentMethod: method,
          sellerCode: sellerCode || null,
          fullName: fullName.trim(),
          cpfCnpj: cpfDigits,
          phone: phoneDigits || null,
          card:
            method === "card"
              ? {
                  holderName: cardHolderName.trim() || fullName.trim(),
                  number: cardNumber.replace(/\D/g, ""),
                  expiryMonth: (expMonth ?? "").padStart(2, "0"),
                  expiryYear: expYearShort?.length === 2 ? `20${expYearShort}` : (expYearShort ?? ""),
                  ccv: cardCcv,
                  holderCpfCnpj: (cardHolderCpf || cpfCnpj).replace(/\D/g, ""),
                  holderPostalCode: cardCep.replace(/\D/g, ""),
                  holderAddressNumber: cardAddrNumber,
                  holderPhone: phoneDigits || undefined,
                }
              : null,
        },
      });

      if (res.status === "pago" && method === "card") {
        toast.success("Pagamento aprovado");
        if (destinatario === "eu") {
          await assign({ data: { purchaseId: res.purchaseId } });
          navigate({ to: "/teste/$id/intro", params: { id: res.purchaseId } });
        } else {
          navigate({ to: "/testes/$id/destinatario", params: { id: res.purchaseId } });
        }
        return;
      }

      // PIX ou Boleto: vai para tela de pagamento pendente
      navigate({
        to: "/pagamento/$id",
        params: { id: res.purchaseId },
        search: { destinatario },
      });
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

            <div>
              <Label className="mb-3 block">Forma de pagamento</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as "pix" | "card" | "boleto")}
                className="grid grid-cols-3 gap-3"
              >
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="pix" /> <span>PIX</span>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="card" /> <span>Cartão</span>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/40">
                  <RadioGroupItem value="boleto" /> <span>Boleto</span>
                </label>
              </RadioGroup>
            </div>
            {method === "card" && (
              <div className="space-y-3 p-4 rounded-xl border border-border">
                <div className="space-y-2">
                  <Label>Número do cartão</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Validade</Label>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                      }}
                      placeholder="MM/AA"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CVV</Label>
                    <Input
                      value={cardCcv}
                      onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome impresso no cartão</Label>
                  <Input value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} placeholder="Igual ao cartão" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CPF/CNPJ do titular</Label>
                    <Input
                      value={cardHolderCpf}
                      onChange={(e) => setCardHolderCpf(maskCpfCnpj(e.target.value))}
                      placeholder="Se diferente do pagador"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP do titular</Label>
                    <Input
                      value={cardCep}
                      onChange={(e) => setCardCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="00000-000"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número do endereço</Label>
                  <Input value={cardAddrNumber} onChange={(e) => setCardAddrNumber(e.target.value)} placeholder="Ex.: 123" required />
                </div>
              </div>
            )}
            {method === "boleto" && (
              <Alert>
                <AlertDescription>
                  O boleto vence em 3 dias. A compra será liberada após a compensação (1 a 2 dias úteis).
                </AlertDescription>
              </Alert>
            )}
            {method === "pix" && (
              <Alert>
                <AlertDescription>
                  Após confirmar, você verá o QR Code e o copia-e-cola PIX. A liberação é automática.
                </AlertDescription>
              </Alert>
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
              Pagamento processado pelo Asaas (sandbox).
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}
