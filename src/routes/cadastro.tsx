import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/cadastro")({ component: Cadastro });

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("/");
}

function parseBR(value: string): Date | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  if (y < 1900 || date > new Date()) return null;
  return date;
}

function calcAge(date: Date) {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

function Cadastro() {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const date = parseBR(birthDate);
    if (!date) {
      setError("Por favor, informe uma data de nascimento válida.");
      return;
    }
    if (calcAge(date) < 18) {
      setError(
        "Para criar uma conta, é necessário ter 18 anos ou mais. Peça a um responsável maior de idade para criar a conta — depois ele poderá adicionar você como testando.",
      );
      return;
    }
    setError(null);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold">Criar conta</h1>
        <p className="text-muted-foreground mt-2">Você será o <strong>master</strong> — quem compra e gerencia testes.</p>
        <form className="glass rounded-2xl p-6 mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2"><Label>Nome completo</Label><Input placeholder="Seu nome" /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" placeholder="voce@email.com" /></div>
          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <Input
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={birthDate}
              maxLength={10}
              onChange={(e) => setBirthDate(formatDateInput(e.target.value))}
            />
          </div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" placeholder="••••••••" /></div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <GradientButton type="submit" className="w-full">Criar conta</GradientButton>
        </form>
      </main>
    </div>
  );
}
