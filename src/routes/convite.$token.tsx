import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift } from "lucide-react";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { getInviteByToken, consumeInvite, checkInviteEmailStatus } from "@/lib/invites.functions";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/convite/$token")({ component: Convite });

function Convite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchInvite = useServerFn(getInviteByToken);
  const doConsume = useServerFn(consumeInvite);
  const checkEmail = useServerFn(checkInviteEmailStatus);

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  useEffect(() => {
    fetchInvite({ data: { token } }).then(async (r) => {
      setInvite(r);
      if (r?.testandoName) setName(r.testandoName);
      if (r?.testandoEmail) setEmail(r.testandoEmail);
      if (r && !r.consumed && !r.expired) {
        try {
          const status = await checkEmail({ data: { token } });
          if (status.emailExists) setMode("login");
        } catch { /* ignore */ }
      }
    }).finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) { setError("Supabase não configurado."); return; }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: signErr } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name, role: "user" } },
        });
        if (signErr) {
          const msg = signErr.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            setMode("login");
            setPassword("");
            setError("Este e-mail já tem uma conta. Informe sua senha para aceitar o convite.");
            setSubmitting(false);
            return;
          }
          setError(translateAuthError(signErr.message));
          setSubmitting(false);
          return;
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError("Senha incorreta. Tente novamente ou recupere sua senha.");
          setSubmitting(false);
          return;
        }
      }
      const res = await doConsume({ data: { token } });
      navigate({ to: "/teste/$id/intro", params: { id: res.purchaseId } });
    } catch (err: any) {
      setError(err?.message ?? "Erro ao processar convite.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen"><BrandHeader /><main className="container mx-auto px-6 py-16 text-center text-muted-foreground">Carregando...</main></div>;
  if (!invite) return <div className="min-h-screen"><BrandHeader /><main className="container mx-auto px-6 py-16 text-center"><h1 className="font-display text-2xl">Convite inválido</h1></main></div>;
  if (invite.consumed) return <div className="min-h-screen"><BrandHeader /><main className="container mx-auto px-6 py-16 text-center"><h1 className="font-display text-2xl">Convite já utilizado</h1></main></div>;
  if (invite.expired) return <div className="min-h-screen"><BrandHeader /><main className="container mx-auto px-6 py-16 text-center"><h1 className="font-display text-2xl">Convite expirado</h1></main></div>;

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-xl text-center">
        <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-gradient-brand text-white mx-auto"><Gift className="h-7 w-7" /></span>
        <h1 className="font-display text-3xl font-bold mt-6">Você recebeu um teste de presente</h1>
        <p className="text-muted-foreground mt-2">
          {mode === "signup"
            ? <>Convite de {invite.masterName}. Crie sua conta para começar.</>
            : <>Convite de {invite.masterName}. Você já tem uma conta — informe sua senha para aceitar.</>}
        </p>
        <form onSubmit={onSubmit} className="glass rounded-2xl p-6 mt-8 text-left space-y-4">
          {mode === "signup" && (
            <div className="space-y-2"><Label>Seu nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={mode === "login"} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 6 : 1} autoFocus={mode === "login"} />
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <GradientButton type="submit" size="lg" className="w-full cursor-pointer" disabled={submitting}>
            {submitting ? "..." : mode === "signup" ? "Aceitar e começar" : "Entrar e aceitar convite"}
          </GradientButton>
          {mode === "login" && (
            <div className="text-center text-sm">
              <Link to="/login" className="text-muted-foreground hover:text-foreground underline cursor-pointer">
                Esqueci minha senha
              </Link>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
