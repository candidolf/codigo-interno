import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { ConfirmDialog } from "@/components/brand/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listAdminUsers } from "@/lib/admin-users.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({ component: AdminUsers });

type Row = {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  phone: string | null;
  linked_master_id: string | null;
  email: string | null;
  role: "admin" | "master" | "user" | null;
};

function ageFrom(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function AdminUsers() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "master" | "user">("user");
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const fetchUsers = useServerFn(listAdminUsers);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers() as Promise<Row[]>,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_roles").delete().eq("user_id", id);
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário removido (perfil + papel)");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const list = (data ?? [])
    .filter((u) => filter === "all" || u.role === filter)
    .filter((u) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (u.full_name ?? "").toLowerCase().includes(s) ||
        (u.email ?? "").toLowerCase().includes(s) ||
        u.id.includes(s)
      );
    });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie admins, masters e testandos.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Input
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <div className="flex gap-1.5">
              {["all", "admin", "master", "user"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={`cursor-pointer text-xs px-3 py-1.5 rounded-full border ${
                    filter === r
                      ? "bg-gradient-brand text-white border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "all" ? "Todos" : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive py-8">
                    Erro ao carregar: {(error as any)?.message ?? "desconhecido"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary border border-border">
                      {u.role ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                  <TableCell>{ageFrom(u.birth_date) ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <button
                        className="cursor-pointer inline-flex items-center gap-1 text-sm hover:text-primary"
                        onClick={() => {
                          setEditing(u);
                          setEditRole((u.role as any) ?? "user");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Papel
                      </button>
                      <button
                        className="cursor-pointer inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete(u)}
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

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar papel</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{editing?.full_name}</p>
              <Label>Papel</Label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as any)}
                className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
              >
                <option value="admin">admin</option>
                <option value="master">master</option>
                <option value="user">user</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="cursor-pointer" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                className="cursor-pointer bg-gradient-brand text-white border-0"
                disabled={updateRole.isPending}
                onClick={() => editing && updateRole.mutate({ userId: editing.id, role: editRole })}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(null)}
          title="Remover usuário?"
          description={`Isto remove o perfil e papéis de ${toDelete?.full_name ?? ""}. A conta de login permanecerá em auth.users.`}
          onConfirm={() => toDelete && removeUser.mutate(toDelete.id)}
        />
      </main>
    </div>
  );
}