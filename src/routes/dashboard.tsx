import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { StatCard } from "@/components/brand/StatCard";
import { TestStatusBadge } from "@/components/brand/TestStatusBadge";
import { purchases } from "@/data/mock";
import { ShoppingBag, FileText, Users, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const completed = purchases.filter((p) => p.status === "Concluído").length;
  return (
    <div className="min-h-screen">
      <BrandHeader role="master" />
      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Olá, Carlos</p>
            <h1 className="font-display text-4xl font-bold mt-1">Seus testes</h1>
          </div>
          <GradientButton size="lg" asChild>
            <Link to="/comprar"><Plus className="h-4 w-4" />Comprar novo teste — R$ 29,90</Link>
          </GradientButton>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <StatCard icon={ShoppingBag} label="Testes adquiridos" value={purchases.length} />
          <StatCard icon={FileText} label="Relatórios prontos" value={completed} />
          <StatCard icon={Users} label="Pessoas testadas" value={purchases.length} />
        </div>

        <h2 className="font-display text-xl font-bold mt-12 mb-4">Histórico</h2>
        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {purchases.map((p) => (
            <div key={p.id} className="p-5 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="font-display font-semibold">{p.testandoName} <span className="text-muted-foreground text-sm">· {p.testandoAge} anos</span></div>
                <div className="text-xs text-muted-foreground mt-1">Comprado em {p.createdAt} · #{p.id}</div>
              </div>
              <div className="flex items-center gap-3">
                <TestStatusBadge status={p.status} />
                {p.status === "Concluído" ? (
                  <Link to="/relatorio/$id" params={{ id: p.id }} className="text-sm underline">Ver relatório</Link>
                ) : p.status === "Em andamento" ? (
                  <Link to="/teste/$id/salas" params={{ id: p.id }} className="text-sm underline">Continuar</Link>
                ) : p.status === "Não iniciado" ? (
                  <Link to="/testes/$id/destinatario" params={{ id: p.id }} className="text-sm underline">Configurar</Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Aguardando convidado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
