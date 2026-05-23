import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { StatCard } from "@/components/brand/StatCard";
import { TestStatusBadge } from "@/components/brand/TestStatusBadge";
import { ShoppingBag, FileText, Users, Plus } from "lucide-react";
import { listMyPurchases } from "@/lib/purchases.functions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Status = "aguardando_pagamento" | "pago" | "aguardando_convidado" | "em_andamento" | "concluido" | "cancelado";

const STATUS_LABEL: Record<Status, "Não iniciado" | "Em andamento" | "Concluído" | "Aguardando convidado"> = {
  aguardando_pagamento: "Não iniciado",
  pago: "Não iniciado",
  aguardando_convidado: "Aguardando convidado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Não iniciado",
};

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return s; }
}

function Dashboard() {
  const fetchList = useServerFn(listMyPurchases);
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: () => fetchList(),
  });

  const list = purchases ?? [];
  const completed = list.filter((p) => p.status === "concluido").length;

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Olá</p>
            <h1 className="font-display text-4xl font-bold mt-1">Seus testes</h1>
          </div>
          <GradientButton size="lg" asChild>
            <Link to="/comprar" className="cursor-pointer"><Plus className="h-4 w-4" />Comprar novo teste — R$ 29,90</Link>
          </GradientButton>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <StatCard icon={ShoppingBag} label="Testes adquiridos" value={list.length} />
          <StatCard icon={FileText} label="Relatórios prontos" value={completed} />
          <StatCard icon={Users} label="Pessoas testadas" value={list.filter(p => p.testando_user_id).length} />
        </div>

        <h2 className="font-display text-xl font-bold mt-12 mb-4">Histórico</h2>
        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {isLoading && (
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-1/2" />
            </div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Você ainda não tem testes. <Link to="/comprar" className="underline cursor-pointer">Comprar agora</Link>.
            </div>
          )}
          {list.map((p) => {
            const label = STATUS_LABEL[p.status as Status];
            return (
              <div key={p.id} className="p-5 flex flex-wrap items-center gap-4 justify-between">
                <div>
                  <div className="font-display font-semibold">
                    {p.testando_name ?? "Sem destinatário"}
                    {p.simulated && <span className="ml-2 text-xs text-muted-foreground">(simulado)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Comprado em {fmtDate(p.created_at)} · #{p.id.slice(0, 8)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TestStatusBadge status={label} />
                  {p.status === "concluido" ? (
                    <Link to="/relatorio/$id" params={{ id: p.id }} className="text-sm underline cursor-pointer">Ver relatório</Link>
                  ) : p.status === "em_andamento" ? (
                    <Link to="/teste/$id/salas" params={{ id: p.id }} className="text-sm underline cursor-pointer">Continuar</Link>
                  ) : p.status === "pago" ? (
                    <Link to="/testes/$id/destinatario" params={{ id: p.id }} className="text-sm underline cursor-pointer">Definir destinatário</Link>
                  ) : p.status === "aguardando_convidado" ? (
                    <span className="text-xs text-muted-foreground">Aguardando convidado</span>
                  ) : p.status === "aguardando_pagamento" ? (
                    <Link to="/comprar" className="text-sm underline cursor-pointer">Retomar pagamento</Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
