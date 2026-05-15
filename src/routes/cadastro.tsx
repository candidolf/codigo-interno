import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cadastro")({ component: Cadastro });

function Cadastro() {
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-16 max-w-md">
        <h1 className="font-display text-3xl font-bold">Criar conta</h1>
        <p className="text-muted-foreground mt-2">Você será o <strong>master</strong> — quem compra e gerencia testes.</p>
        <form className="glass rounded-2xl p-6 mt-8 space-y-4">
          <div className="space-y-2"><Label>Nome completo</Label><Input placeholder="Seu nome" /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" placeholder="voce@email.com" /></div>
          <div className="space-y-2"><Label>Idade</Label><Input type="number" placeholder="18+" /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" placeholder="••••••••" /></div>
          <GradientButton className="w-full" asChild>
            <Link to="/dashboard">Criar conta</Link>
          </GradientButton>
        </form>
      </main>
    </div>
  );
}
