import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Código Interno" },
      { name: "description", content: "Receba um link por e-mail para redefinir sua senha." },
    ],
  }),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) {
      setError("Supabase ainda não configurado.");
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/redefinir-senha`
          : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      // Mensagem genérica em ambos os casos para não vazar existência de conta.
      if (err) {
        // Loga internamente, mas mostra sucesso ao usuário.
        console.warn("resetPasswordForEmail:", err.message);
      }
      setSent(true);
    } catch (e: any) {
      setError(translateAuthError(e?.message ?? "Erro ao solicitar recuperação"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold text-center">Recuperar senha</h1>
        <p className="text-muted-foreground mt-2 text-center">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>

        {sent ? (
          <div className="glass rounded-2xl p-6 mt-8 space-y-4">
            <Alert>
              <AlertDescription>
                Se este e-mail estiver cadastrado, você receberá em instantes um link para
                redefinir sua senha. Verifique também a caixa de spam.
              </AlertDescription>
            </Alert>
            <div className="text-center text-sm">
              <Link to="/login" className="underline cursor-pointer">
                Voltar para o login
              </Link>
            </div>
          </div>
        ) : (
          <form className="glass rounded-2xl p-6 mt-8 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
                autoFocus
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <GradientButton type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </GradientButton>
            <p className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{" "}
              <Link to="/login" className="underline cursor-pointer">
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}