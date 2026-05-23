import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { commissions } from "@/data/mock";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/brand/StatCard";
import { DollarSign, Users, Percent } from "lucide-react";

export const Route = createFileRoute("/admin/comissoes")({ component: AdminCommissions });

function AdminCommissions() {
  const totalSold = commissions.reduce((a, c) => a + c.testsSold, 0);
  const totalGross = commissions.reduce((a, c) => a + c.gross, 0);
  const totalCommission = commissions.reduce((a, c) => a + c.gross * c.rate, 0);
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Comissões de venda</h1>
        <p className="text-muted-foreground">Relatório por código de vendedor informado no checkout.</p>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <StatCard icon={Users} label="Vendedores ativos" value={commissions.length} />
          <StatCard icon={DollarSign} label="Receita rastreada" value={`R$ ${totalGross.toFixed(2)}`} hint={`${totalSold} testes`} />
          <StatCard icon={Percent} label="Comissão a pagar" value={`R$ ${totalCommission.toFixed(2)}`} />
        </div>

        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Vendedor</TableHead><TableHead>Testes</TableHead><TableHead>Bruto</TableHead><TableHead>%</TableHead><TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow key={c.sellerCode}>
                  <TableCell className="font-mono text-xs">{c.sellerCode}</TableCell>
                  <TableCell className="font-medium">{c.sellerName}</TableCell>
                  <TableCell>{c.testsSold}</TableCell>
                  <TableCell>R$ {c.gross.toFixed(2)}</TableCell>
                  <TableCell>{(c.rate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-display font-bold">R$ {(c.gross * c.rate).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right">Total</TableCell>
                <TableCell className="text-right font-display font-bold text-gradient-brand">R$ {totalCommission.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </main>
    </div>
  );
}
