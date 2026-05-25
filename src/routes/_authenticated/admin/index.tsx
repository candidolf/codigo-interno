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
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminHome });

function MockBadge() {
  return (
    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground ml-2">
      mock
    </span>
  );
}

const mockBars = [
  { m: "Dez", v: 38 },
  { m: "Jan", v: 52 },
  { m: "Fev", v: 47 },
  { m: "Mar", v: 65 },
  { m: "Abr", v: 71 },
  { m: "Mai", v: 84 },
];

function AdminHome() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [rolesRes, purRes] = await Promise.all([
        supabase.from("user_roles").select("role"),
        supabase.from("test_purchases").select("status"),
      ]);
      const roles = (rolesRes.data ?? []) as { role: string }[];
      const purchases = (purRes.data ?? []) as { status: string }[];
      return {
        masters: roles.filter((r) => r.role === "master").length,
        users: roles.filter((r) => r.role === "user").length,
        sold: purchases.length,
        emAndamento: purchases.filter((p) => p.status === "em_andamento").length,
        concluidos: purchases.filter((p) => p.status === "concluido").length,
      };
    },
  });

  const s = stats.data;
  const max = Math.max(...mockBars.map((b) => b.v));

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Painel admin</h1>
        <p className="text-muted-foreground">Visão geral da operação.</p>

        <h2 className="font-display text-lg font-bold mt-10 mb-3 flex items-center">
          Financeiro <MockBadge />
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Receita do mês" value="R$ 24.510,00" hint="vs. R$ 19.880 anterior" />
          <StatCard icon={TrendingUp} label="Receita acumulada" value="R$ 187.330,00" hint="últimos 12 meses" />
          <StatCard icon={ShoppingBag} label="Ticket médio" value="R$ 29,90" />
          <StatCard icon={Percent} label="Comissões a pagar" value="R$ 4.902,00" hint="próximo ciclo" />
        </div>

        <h2 className="font-display text-lg font-bold mt-10 mb-3">Operação</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Masters" value={s?.masters ?? "—"} />
          <StatCard icon={Users} label="Testandos" value={s?.users ?? "—"} />
          <StatCard icon={ShoppingBag} label="Testes vendidos" value={s?.sold ?? "—"} />
          <StatCard icon={Activity} label="Em andamento" value={s?.emAndamento ?? "—"} />
          <StatCard icon={CheckCircle2} label="Concluídos" value={s?.concluidos ?? "—"} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-10">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-display font-bold flex items-center">
              Receita por mês <MockBadge />
            </h3>
            <div className="flex items-end gap-3 h-40 mt-6">
              {mockBars.map((b) => (
                <div key={b.m} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-gradient-brand transition-all"
                    style={{ height: `${(b.v / max) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{b.m}</span>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
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