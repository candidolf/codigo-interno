import { Link } from "@tanstack/react-router";
import { BrandHeader } from "./BrandHeader";
import { GradientButton } from "./GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { questions, type Room } from "@/data/mock";
import { GripVertical, Plus, Trash2 } from "lucide-react";

export function SalaForm({ room }: { room?: Room }) {
  const editing = !!room;
  const qs = room ? questions.filter((q) => q.roomSlug === room.slug) : [];
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <Link to="/admin/salas" className="text-sm text-muted-foreground hover:text-foreground">← Salas</Link>
        <h1 className="font-display text-4xl font-bold mt-2">{editing ? "Editar sala" : "Nova sala"}</h1>

        <form className="glass rounded-2xl p-6 mt-8 space-y-5">
          <div className="space-y-2"><Label>Nome</Label><Input defaultValue={room?.title} placeholder="Ex.: Sala da Alegria" /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea defaultValue={room?.description} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tema</Label>
              <select defaultValue={room?.theme} className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm">
                <option value="joy">Alegria</option>
                <option value="fear">Medo</option>
                <option value="anger">Raiva</option>
                <option value="discovery">Descobertas</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Cor primária</Label><Input type="color" defaultValue="#7c3aed" className="h-9 w-full" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Idade mínima</Label><Input type="number" defaultValue={room?.ageMin ?? 6} /></div>
            <div className="space-y-2"><Label>Idade máxima</Label><Input type="number" defaultValue={room?.ageMax ?? 99} /></div>
          </div>
        </form>

        <div className="flex justify-between items-center mt-10 mb-4">
          <h2 className="font-display text-xl font-bold">Perguntas da sala</h2>
          <button className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-secondary"><Plus className="h-3.5 w-3.5" />Nova pergunta</button>
        </div>
        <div className="glass rounded-2xl divide-y divide-border">
          {qs.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma pergunta cadastrada ainda.</div>}
          {qs.map((q, i) => (
            <div key={q.id} className="p-4 flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">#{i + 1} · {q.answers.length} alternativas</p>
                <p className="text-sm">{q.text}</p>
              </div>
              <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <GradientButton asChild><Link to="/admin/salas">Salvar sala</Link></GradientButton>
          <Link to="/admin/salas" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</Link>
        </div>
      </main>
    </div>
  );
}
