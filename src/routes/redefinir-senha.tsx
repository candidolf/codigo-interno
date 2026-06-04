import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Código Interno" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: RedefinirSenha,
});

type Status = "checking" | "ready" | "invalid";

function RedefinirSenha() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setStatus("invalid");
      return;
    }
    let active = true;

    // Supabase emite PASSWORD_RECOVERY quando a página é aberta via link de recuperação.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // Fallback: em refresh manual, já existe sessão; aceitamos se houver token.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) {
        setStatus((s) => (s === "checking" ? "ready" : s));
      } else {
        // Aguarda um pouco para o evento PASSWORD_RECOVERY chegar via hash do URL.
        setTimeout(() => {
          if (!active) return;
          setStatus((s) => (s === "checking" ? "invalid" : s));
        }, 1500);
      }
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(translateAuthError(err.message));
        return;
      }
      toast.success("Senha redefinida com sucesso!");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setError(translateAuthError(e?.message ?? "Erro ao redefinir senha"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold text-center">Nova senha</h1>
        <p className="text-muted-foreground mt-2 text-center">
          Defina a nova senha para sua conta.
        </p>

        {status === "checking" && (
          <div className="glass rounded-2xl p-6 mt-8 text-center text-muted-foreground">
            Validando link…
          </div>
        )}

        {status === "invalid" && (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Link inválido ou expirado. Solicite um novo link de recuperação.
              </AlertDescription>
            </Alert>
            <GradientButton asChild className="w-full cursor-pointer">
              <Link to="/recuperar-senha">Solicitar novo link</Link>
            </GradientButton>
          </div>
        )}

        {status === "ready" && (
          <form className="glass rounded-2xl p-6 mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                minLength={8}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <GradientButton type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </GradientButton>
          </form>
        )}
      </main>
    </div>
  );
}