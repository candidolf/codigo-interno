import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { adminUsers } from "@/data/mock";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

export const Route = createFileRoute("/admin/usuarios")({ component: AdminUsers });

function AdminUsers() {
  const [filter, setFilter] = useState<string>("all");
  const list = adminUsers.filter((u) => filter === "all" || u.role === filter);
  return (
    <div className="min-h-screen">
      <BrandHeader role="admin" />
      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie admins, masters e testandos.</p>
          </div>
          <div className="flex gap-1.5">
            {["all", "admin", "master", "user"].map((r) => (
              <button key={r} onClick={() => setFilter(r)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === r ? "bg-gradient-brand text-white border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {r === "all" ? "Todos" : r}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Role</TableHead><TableHead>Idade</TableHead><TableHead>Vínculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><span className="text-xs px-2 py-1 rounded-full bg-secondary border border-border">{u.role}</span></TableCell>
                  <TableCell>{u.age}</TableCell>
                  <TableCell className="text-muted-foreground">{u.linkedTo ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
