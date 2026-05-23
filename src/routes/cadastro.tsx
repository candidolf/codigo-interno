import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/cadastro")({ component: Cadastro });

function formatDateInput(v: string) { const d = v.replace(/\D/g, "").slice(0, 8); const p = [d.slice(0,2), d.slice(2,4), d.slice(4,8)].filter(Boolean); return p.join("/"); }
function formatPhoneInput(v: string) { const d = v.replace(/\D/g, "").slice(0, 11); if (d.length <= 2) return d; if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; }
function parseBR(v: string): Date | null { const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return null; const [,dd,mm,yyyy] = m; const d = new Date(+yyyy, +mm - 1, +dd); if (d.getFullYear() !== +yyyy || d.getMonth() !== +mm - 1 || d.getDate() !== +dd) return null; if (+yyyy < 1900 || d > new Date()) return null; return d; }
function calcAge(d: Date) { const now = new Date(); let a = now.getFullYear() - d.getFullYear(); const m = now.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--; return a; }
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function Cadastro() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) { setError("Supabase ainda não configurado. Preencha o .env."); return; }
    const date = parseBR(birthDate);
    if (!date) { setError("Data de nascimento inválida."); return; }
    if (calcAge(date) < 18) { setError("Para criar conta master é necessário ter 18 anos ou mais."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone, birth_date: toISO(date), role: "master" },
        },
      });
      if (err) { setError(translateAuthError(err.message)); return; }
      navigate({ to: "/dashboard" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold">Criar conta</h1>
        <p className="text-muted-foreground mt-2">Você será o <strong>master</strong> — quem compra e gerencia testes.</p>
        <form className="glass rounded-2xl p-6 mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" required /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required /></div>
          <div className="space-y-2"><Label>Data de nascimento</Label><Input inputMode="numeric" placeholder="DD/MM/AAAA" value={birthDate} maxLength={10} onChange={(e) => setBirthDate(formatDateInput(e.target.value))} required /></div>
          <div className="space-y-2"><Label>Celular (whatsapp)</Label><Input inputMode="numeric" placeholder="(11) 99999-9999" value={phone} maxLength={16} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} /></div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="pr-10" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <GradientButton type="submit" className="w-full cursor-pointer" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</GradientButton>
          <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="underline cursor-pointer">Entrar</Link></p>
        </form>
      </main>
    </div>
  );
}
