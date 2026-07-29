import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { ConfirmDialog } from "@/components/brand/ConfirmDialog";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/admin/agentes/")({
  component: AdminAgentes,
});

const kindLabel: Record<string, string> = {
  question_generator: "Gerador de perguntas",
  report_analyzer: "Analista de relatório",
};

function AdminAgentes() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, kind, model, active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (a: any) =>
        a.name?.toLowerCase().includes(term) ||
        a.model?.toLowerCase().includes(term) ||
        kindLabel[a.kind]?.toLowerCase().includes(term),
    );
  }, [data, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agente excluído");
      qc.invalidateQueries({ queryKey: ["admin-ai-agents"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Agentes de IA</h1>
            <p className="text-muted-foreground">
              Prompts que geram perguntas e analisam as respostas.
            </p>
          </div>
          <GradientButton asChild>
            <Link to="/admin/agentes/novo" className="cursor-pointer">
              <Plus className="h-4 w-4" />
              Novo agente
            </Link>
          </GradientButton>
        </div>

        <div className="mt-6 max-w-sm">
          <Input
            placeholder="Buscar por nome, tipo ou modelo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="glass rounded-2xl mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum agente cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{kindLabel[a.kind] ?? a.kind}</TableCell>
                  <TableCell className="text-muted-foreground">{a.model}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        a.active
                          ? "bg-discovery/20 text-discovery"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {a.active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-3">
                      <Link
                        to="/admin/agentes/$id"
                        params={{ id: a.id }}
                        className="cursor-pointer inline-flex items-center gap-1 text-sm hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Link>
                      <button
                        onClick={() => setToDelete({ id: a.id, name: a.name })}
                        className="cursor-pointer inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
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
          title="Excluir agente?"
          description={`O agente "${toDelete?.name}" será removido permanentemente.`}
          onConfirm={() => toDelete && del.mutate(toDelete.id)}
        />
      </main>
    </div>
  );
}