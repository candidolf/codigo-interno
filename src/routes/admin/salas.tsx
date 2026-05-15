import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { rooms, themeStyle } from "@/data/mock";
import { AgeRangeBadge } from "@/components/brand/AgeRangeBadge";
import { Plus, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/salas")({ component: AdminSalas });

function AdminSalas() {
  return (
    <div className="min-h-screen">
      <BrandHeader role="admin" />
      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold">Salas</h1>
            <p className="text-muted-foreground">Gerencie temas, faixas etárias e perguntas.</p>
          </div>
          <GradientButton asChild><Link to="/admin/salas/nova"><Plus className="h-4 w-4" />Nova sala</Link></GradientButton>
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
              {rooms.map((r) => {
                const s = themeStyle(r.theme);
                return (
                  <TableRow key={r.slug}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell><span className={s.text}>{s.emoji} {r.theme}</span></TableCell>
                    <TableCell><AgeRangeBadge min={r.ageMin} max={r.ageMax} /></TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded-full bg-discovery/20 text-discovery">Ativa</span></TableCell>
                    <TableCell className="text-right">
                      <Link to="/admin/salas/$id" params={{ id: r.slug }} className="inline-flex items-center gap-1 text-sm hover:text-primary">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
