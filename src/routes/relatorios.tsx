import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { purchases } from "@/data/mock";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/relatorios")({ component: Relatorios });

function Relatorios() {
  const done = purchases.filter((p) => p.status === "Concluído");
  return (
    <div className="min-h-screen">
      <BrandHeader role="master" />
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Relatórios</h1>
        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {done.map((p) => (
            <Link key={p.id} to="/relatorio/$id" params={{ id: p.id }} className="glass rounded-2xl p-6 hover:-translate-y-0.5 transition-transform">
              <FileText className="h-6 w-6 text-brand-purple" />
              <h3 className="font-display font-bold mt-3">{p.testandoName}</h3>
              <p className="text-xs text-muted-foreground mt-1">Concluído em {p.createdAt}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
