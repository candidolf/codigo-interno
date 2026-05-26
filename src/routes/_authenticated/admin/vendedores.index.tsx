import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { ConfirmDialog } from "@/components/brand/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/vendedores/")({
  component: AdminVendedores,
});

function AdminVendedores() {
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const monthStart = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  })();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sellers", "with-month-tests"],
    queryFn: async () => {
      const sellersRes = await supabase.from("sellers").select("*").order("full_name");
      if (sellersRes.error) throw sellersRes.error;
      const { data: purchases } = await
        supabase
          .from("test_purchases")
          .select("seller_code")
          .gte("created_at", monthStart)
          .in("status", ["pago", "em_andamento", "concluido"]);
      const sellers = sellersRes.data;
      const counts = new Map<string, number>();
      (purchases ?? []).forEach((p: any) => {
        if (!p.seller_code) return;
        counts.set(p.seller_code, (counts.get(p.seller_code) ?? 0) + 1);
      });
      return (sellers ?? []).map((s: any) => ({
        ...s,
        month_tests: counts.get(s.code) ?? 0,
      }));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendedor excluído");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold">Vendedores</h1>
            <p className="text-muted-foreground">Cadastro e desempenho por código de vendedor.</p>
          </div>
          <GradientButton asChild>
            <Link to="/admin/vendedores/novo" className="cursor-pointer">
              <Plus className="h-4 w-4" />
              Novo vendedor
            </Link>
          </GradientButton>
        </div>
        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Testes no mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {isError
                      ? `Erro: ${(error as any)?.message ?? "falha ao carregar"}`
                      : "Nenhum vendedor cadastrado."}
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                  <TableCell>{(s.commission_rate * 100).toFixed(1)}%</TableCell>
                  <TableCell>{s.month_tests}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        s.active
                          ? "bg-discovery/20 text-discovery"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        to="/admin/vendedores/$code"
                        params={{ code: s.code }}
                        className="cursor-pointer inline-flex items-center gap-1 text-sm hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Link>
                      <button
                        className="cursor-pointer inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete({ id: s.id, name: s.full_name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ConfirmDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          title="Excluir vendedor?"
          description={`O vendedor "${toDelete?.name}" será removido. Históricos com este código ficam preservados.`}
          onConfirm={() => toDelete && del.mutate(toDelete.id)}
        />
      </main>
    </div>
  );
}