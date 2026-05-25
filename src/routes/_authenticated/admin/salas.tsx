import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { ConfirmDialog } from "@/components/brand/ConfirmDialog";
import { AgeRangeBadge } from "@/components/brand/AgeRangeBadge";
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

export const Route = createFileRoute("/_authenticated/admin/salas")({ component: AdminSalas });

const themeLabel: Record<string, { emoji: string; cls: string; label: string }> = {
  joy: { emoji: "☀️", cls: "text-joy", label: "Alegria" },
  fear: { emoji: "🌙", cls: "text-fear", label: "Medo" },
  anger: { emoji: "🔥", cls: "text-anger", label: "Raiva" },
  discovery: { emoji: "🧭", cls: "text-discovery", label: "Descobertas" },
};

function AdminSalas() {
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, slug, title, theme, age_min, age_max, active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sala excluída");
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
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
            <h1 className="font-display text-4xl font-bold">Salas</h1>
            <p className="text-muted-foreground">Gerencie temas, faixas etárias e perguntas.</p>
          </div>
          <GradientButton asChild>
            <Link to="/admin/salas/nova" className="cursor-pointer">
              <Plus className="h-4 w-4" />
              Nova sala
            </Link>
          </GradientButton>
        </div>
        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sala</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Faixa etária</TableHead>
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
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma sala cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((r: any) => {
                const t = themeLabel[r.theme] ?? { emoji: "•", cls: "", label: r.theme };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      <span className={t.cls}>
                        {t.emoji} {t.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AgeRangeBadge min={r.age_min} max={r.age_max} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          r.active
                            ? "bg-discovery/20 text-discovery"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.active ? "Ativa" : "Inativa"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-3">
                        <Link
                          to="/admin/salas/$id"
                          params={{ id: r.id }}
                          className="cursor-pointer inline-flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <button
                          onClick={() => setToDelete({ id: r.id, title: r.title })}
                          className="cursor-pointer inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <ConfirmDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          title="Excluir sala?"
          description={`A sala "${toDelete?.title}" e todas as suas perguntas serão removidas.`}
          onConfirm={() => toDelete && del.mutate(toDelete.id)}
        />
      </main>
    </div>
  );
}