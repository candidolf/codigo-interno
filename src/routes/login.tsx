import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) { setError("Supabase ainda não configurado. Preencha o .env."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(translateAuthError(err.message)); return; }
      // Aguarda a sessão estar disponível para o BrandHeader/useAuth lerem
      // imediatamente como logado ao chegar no dashboard.
      await supabase.auth.getSession();
      const dest = (search.redirect as string) || "/dashboard";
      navigate({ to: dest as any });
    } catch (e: any) {
      setError(translateAuthError(e?.message ?? "Erro ao entrar"));
    } finally { setLoading(false); }
  };

  const onGoogle = async () => {
    if (!supabaseConfigured) return;
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined,
      },
    });
  };
  const googleEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold text-center">Bem vindo</h1>
        <p className="text-muted-foreground mt-2 text-center">Entre com seu login</p>
        <form className="glass rounded-2xl p-6 mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required /></div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pr-10" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <GradientButton type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</GradientButton>
          {googleEnabled ? (
            <button type="button" onClick={onGoogle} className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
              Entrar com Google
            </button>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">Não tem conta? <Link to="/cadastro" className="underline cursor-pointer">Criar conta</Link></p>
        </form>
      </main>
    </div>
  );
}
