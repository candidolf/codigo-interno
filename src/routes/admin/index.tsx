import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatCard } from "@/components/brand/StatCard";
import { Users, ShoppingBag, Activity, DollarSign } from "lucide-react";
import { adminUsers, purchases, commissions } from "@/data/mock";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const masters = adminUsers.filter((u) => u.role === "master").length;
  const users = adminUsers.filter((u) => u.role === "user").length;
  const sold = commissions.reduce((a, c) => a + c.testsSold, 0) + purchases.length;
  const revenue = sold * 29.9;
  return (
    <div className="min-h-screen">
      <BrandHeader role="admin" />
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Painel admin</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <StatCard icon={Users} label="Masters" value={masters} hint="Adultos pagantes" />
          <StatCard icon={Users} label="Testandos" value={users} hint="Vinculados a masters" />
          <StatCard icon={ShoppingBag} label="Testes vendidos" value={sold} />
          <StatCard icon={DollarSign} label="Receita simulada" value={`R$ ${revenue.toFixed(2)}`} />
        </div>
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-bold flex items-center gap-2"><Activity className="h-5 w-5" />Testes em andamento</h2>
            <p className="text-3xl font-display font-bold mt-3">{purchases.filter(p => p.status === "Em andamento").length}</p>
            <p className="text-sm text-muted-foreground">Sessões ativas no momento.</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-bold">Top vendedor</h2>
            <p className="text-xl font-display font-bold mt-3">{commissions[0].sellerName}</p>
            <p className="text-sm text-muted-foreground">{commissions[0].testsSold} testes via {commissions[0].sellerCode}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
