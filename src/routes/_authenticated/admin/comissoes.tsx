import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { StatCard } from "@/components/brand/StatCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, Percent, ShoppingBag, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/comissoes")({
  component: AdminCommissions,
});

type Row = {
  seller_code: string;
  seller_name: string;
  tests: number;
  gross_cents: number;
  rate: number;
  commission_cents: number;
};

const months = (() => {
  const arr: { label: string; iso: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push({
      label: m.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      iso: m.toISOString().slice(0, 10),
    });
  }
  return arr;
})();

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminCommissions() {
  const [month, setMonth] = useState(months[0].iso);

  const { data, isLoading } = useQuery({
    queryKey: ["commissions", month],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc("admin_monthly_commissions", {
        month_start: month,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      sellers: rows.filter((r) => r.tests > 0).length,
      tests: rows.reduce((a, r) => a + Number(r.tests), 0),
      gross: rows.reduce((a, r) => a + Number(r.gross_cents), 0),
      commission: rows.reduce((a, r) => a + Number(r.commission_cents), 0),
    };
  }, [data]);

  const exportCsv = () => {
    const rows = data ?? [];
    const head = ["Código", "Vendedor", "Testes", "Bruto", "%", "Comissão"];
    const body = rows.map((r) => [
      r.seller_code,
      r.seller_name,
      r.tests,
      (r.gross_cents / 100).toFixed(2),
      (r.rate * 100).toFixed(1) + "%",
      (r.commission_cents / 100).toFixed(2),
    ]);
    const csv = [head, ...body].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissoes-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl font-bold">Comissões mensais</h1>
            <p className="text-muted-foreground">Relatório por código de vendedor.</p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="cursor-pointer bg-input border border-border rounded-md h-9 px-3 text-sm"
            >
              {months.map((m) => (
                <option key={m.iso} value={m.iso}>
                  {m.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={exportCsv}
              disabled={!data?.length}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <StatCard icon={Users} label="Vendedores com vendas" value={totals.sellers} />
          <StatCard icon={ShoppingBag} label="Testes" value={totals.tests} />
          <StatCard icon={DollarSign} label="Receita rastreada" value={brl(totals.gross)} />
          <StatCard icon={Percent} label="Comissão a pagar" value={brl(totals.commission)} />
        </div>

        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Testes</TableHead>
                <TableHead>Bruto</TableHead>
                <TableHead>%</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum vendedor cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((r) => (
                <TableRow key={r.seller_code}>
                  <TableCell className="font-mono text-xs">{r.seller_code}</TableCell>
                  <TableCell className="font-medium">{r.seller_name}</TableCell>
                  <TableCell>{r.tests}</TableCell>
                  <TableCell>{brl(r.gross_cents)}</TableCell>
                  <TableCell>{(r.rate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-display font-bold">
                    {brl(r.commission_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {(data ?? []).length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-display font-bold text-gradient-brand">
                    {brl(totals.commission)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </main>
    </div>
  );
}