import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatCard } from "@/components/brand/StatCard";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  UserCog,
  DoorOpen,
  Percent,
  Briefcase,
  Bot,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminHome });

type DashboardStats = {
  masters: number;
  users: number;
  sold: number;
  in_progress: number;
  completed: number;
  current_month_cents: number;
  previous_month_cents: number;
  accumulated_cents: number;
  average_ticket_cents: number;
  commissions_cents: number;
  monthly: { month_start: string; revenue_cents: number }[];
};

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminHome() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats");
      if (error) throw error;
      return data as DashboardStats;
    },
  });

  const s = stats.data;
  const max = Math.max(...(s?.monthly ?? []).map((b) => b.revenue_cents), 1);
  const monthLabel = (month: string) =>
    new Date(`${month}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Painel admin</h1>
        <p className="text-muted-foreground">Visão geral da operação.</p>

        <h2 className="font-display text-lg font-bold mt-10 mb-3 flex items-center">Financeiro</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Receita do mês"
            value={s ? brl(s.current_month_cents) : "—"}
            hint={s ? `vs. ${brl(s.previous_month_cents)} anterior` : undefined}
          />
          <StatCard
            icon={TrendingUp}
            label="Receita acumulada"
            value={s ? brl(s.accumulated_cents) : "—"}
            hint="últimos 12 meses"
          />
          <StatCard
            icon={ShoppingBag}
            label="Ticket médio"
            value={s ? brl(s.average_ticket_cents) : "—"}
          />
          <StatCard
            icon={Percent}
            label="Comissões a pagar"
            value={s ? brl(s.commissions_cents) : "—"}
            hint="vendas pagas"
          />
        </div>

        <h2 className="font-display text-lg font-bold mt-10 mb-3">Operação</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Masters" value={s?.masters ?? "—"} />
          <StatCard icon={Users} label="Testandos" value={s?.users ?? "—"} />
          <StatCard icon={ShoppingBag} label="Testes vendidos" value={s?.sold ?? "—"} />
          <StatCard icon={Activity} label="Em andamento" value={s?.in_progress ?? "—"} />
          <StatCard icon={CheckCircle2} label="Concluídos" value={s?.completed ?? "—"} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-10">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-display font-bold flex items-center">Receita por mês</h3>
            <div className="flex items-end gap-3 h-40 mt-6">
              {(s?.monthly ?? []).map((b) => (
                <div key={b.month_start} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-gradient-brand transition-all"
                    style={{ height: `${(b.revenue_cents / max) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{monthLabel(b.month_start)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-bold">Atalhos</h3>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <QuickLink to="/admin/usuarios" icon={UserCog} label="Usuários" />
              <QuickLink to="/admin/salas" icon={DoorOpen} label="Salas" />
              <QuickLink to="/admin/vendedores" icon={Briefcase} label="Vendedores" />
              <QuickLink to="/admin/comissoes" icon={Percent} label="Comissões" />
              <QuickLink to="/admin/agentes" icon={Bot} label="Agentes de IA" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="cursor-pointer rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 p-3 flex flex-col items-start gap-2 transition-colors"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
