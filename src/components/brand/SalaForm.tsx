import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandHeader } from "./BrandHeader";
import { GradientButton } from "./GradientButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import { GenerateQuestionsDialog, type DraftGenerated } from "./GenerateQuestionsDialog";

type Room = {
  id: string;
  slug: string;
  title: string;
  theme: "joy" | "fear" | "anger" | "discovery";
  description: string | null;
  age_min: number;
  age_max: number;
  primary_color: string | null;
  active: boolean;
  sort_order: number;
  generation_hint?: string | null;
};

type Answer = { id?: string; label: string; emoji: string; sort_order: number };
type Question = {
  id: string;
  text: string;
  sort_order: number;
  answers: Answer[];
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SalaForm({ room }: { room?: Room | null }) {
  const editing = !!room;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: room?.title ?? "",
    slug: room?.slug ?? "",
    description: room?.description ?? "",
    theme: room?.theme ?? "joy",
    primary_color: room?.primary_color ?? "#7c3aed",
    age_min: room?.age_min ?? 6,
    age_max: room?.age_max ?? 99,
    active: room?.active ?? true,
    sort_order: room?.sort_order ?? 0,
    generation_hint: room?.generation_hint ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        generation_hint: form.generation_hint?.trim() ? form.generation_hint.trim() : null,
      };
      if (editing) {
        const { error } = await supabase.from("rooms").update(payload).eq("id", room!.id);
        if (error) throw error;
        return room!.id;
      }
      const { data, error } = await supabase.from("rooms").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Sala salva");
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      navigate({ to: "/admin/salas" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <Link to="/admin/salas" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          ← Salas
        </Link>
        <h1 className="font-display text-4xl font-bold mt-2">
          {editing ? "Editar sala" : "Nova sala"}
        </h1>

        <form
          className="glass rounded-2xl p-6 mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Nome*</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Slug (opcional)</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="auto a partir do nome"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contexto para a IA (opcional)</Label>
            <Textarea
              value={form.generation_hint ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, generation_hint: e.target.value }))}
              placeholder="Tema e orientações que o agente deve considerar ao gerar as perguntas desta sala."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tema</Label>
              <select
                value={form.theme}
                onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as any }))}
                className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
              >
                <option value="joy">Alegria</option>
                <option value="fear">Medo</option>
                <option value="anger">Raiva</option>
                <option value="discovery">Descobertas</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cor primária</Label>
              <Input
                type="color"
                value={form.primary_color ?? "#7c3aed"}
                onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                className="h-9 w-full cursor-pointer"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Idade mín.</Label>
              <Input
                type="number"
                value={form.age_min}
                onChange={(e) => setForm((f) => ({ ...f, age_min: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Idade máx.</Label>
              <Input
                type="number"
                value={form.age_max}
                onChange={(e) => setForm((f) => ({ ...f, age_max: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="cursor-pointer"
            />
            <span className="text-sm">Sala ativa</span>
          </label>
          <div className="flex gap-3 pt-2">
            <GradientButton type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar sala"}
            </GradientButton>
            <Link
              to="/admin/salas"
              className="cursor-pointer px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Link>
          </div>
        </form>

        {editing && <QuestionsEditor roomId={room!.id} room={room!} />}
      </main>
    </div>
  );
}

function QuestionsEditor({ roomId, room }: { roomId: string; room: Room }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Question | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; text: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["room-questions", roomId],
    queryFn: async () => {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, text, sort_order")
        .eq("room_id", roomId)
        .order("sort_order");
      const ids = (qs ?? []).map((q: any) => q.id);
      const { data: ans } = ids.length
        ? await supabase
            .from("answers")
            .select("id, question_id, label, emoji, sort_order")
            .in("question_id", ids)
            .order("sort_order")
        : { data: [] as any[] };
      const byQ = new Map<string, Answer[]>();
      (ans ?? []).forEach((a: any) => {
        const arr = byQ.get(a.question_id) ?? [];
        arr.push({ id: a.id, label: a.label, emoji: a.emoji ?? "", sort_order: a.sort_order });
        byQ.set(a.question_id, arr);
      });
      return (qs ?? []).map((q: any) => ({ ...q, answers: byQ.get(q.id) ?? [] })) as Question[];
    },
  });

  const save = useMutation({
    mutationFn: async (q: Question) => {
      let qid = q.id;
      if (qid) {
        const { error } = await supabase
          .from("questions")
          .update({ text: q.text, sort_order: q.sort_order })
          .eq("id", qid);
        if (error) throw error;
        await supabase.from("answers").delete().eq("question_id", qid);
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert({ room_id: roomId, text: q.text, sort_order: q.sort_order })
          .select("id")
          .single();
        if (error) throw error;
        qid = data.id;
      }
      const rows = q.answers
        .filter((a) => a.label.trim())
        .map((a, i) => ({
          question_id: qid,
          label: a.label,
          emoji: a.emoji,
          sort_order: a.sort_order ?? i,
        }));
      if (rows.length) {
        const { error } = await supabase.from("answers").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pergunta salva");
      qc.invalidateQueries({ queryKey: ["room-questions", roomId] });
      setOpen(false);
      setDraft(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pergunta excluída");
      qc.invalidateQueries({ queryKey: ["room-questions", roomId] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveGenerated = useMutation({
    mutationFn: async (items: DraftGenerated[]) => {
      const base = data?.length ?? 0;
      const valid = items.filter((it) => it.text.trim());
      if (!valid.length) return 0;

      // Insert em lote das perguntas (uma ida ao banco)…
      const { data: inserted, error } = await supabase
        .from("questions")
        .insert(
          valid.map((it, i) => ({
            room_id: roomId,
            text: it.text.trim(),
            sort_order: base + i + 1,
          })),
        )
        .select("id, sort_order")
        .order("sort_order");
      if (error) throw error;

      // …e depois das alternativas (outra ida ao banco).
      const answerRows = (inserted ?? []).flatMap((q: any, idx: number) =>
        valid[idx].answers
          .filter((a) => a.label.trim())
          .map((a, ai) => ({
            question_id: q.id,
            label: a.label.trim(),
            emoji: a.emoji ?? "",
            sort_order: ai,
          })),
      );
      if (answerRows.length) {
        const { error: aErr } = await supabase.from("answers").insert(answerRows);
        if (aErr) throw aErr;
      }
      return valid.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} pergunta(s) adicionada(s) à sala`);
      qc.invalidateQueries({ queryKey: ["room-questions", roomId] });
      setAiOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const newDraft = (): Question => ({
    id: "",
    text: "",
    sort_order: (data?.length ?? 0) + 1,
    answers: [
      { label: "", emoji: "", sort_order: 0 },
      { label: "", emoji: "", sort_order: 1 },
      { label: "", emoji: "", sort_order: 2 },
      { label: "", emoji: "", sort_order: 3 },
    ],
  });

  return (
    <section className="mt-12">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold">Perguntas da sala</h2>
        <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setAiOpen(true)}
          className="cursor-pointer text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-secondary"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
          Gerar com IA
        </button>
        <button
          onClick={() => {
            setDraft(newDraft());
            setOpen(true);
          }}
          className="cursor-pointer text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova pergunta
        </button>
        </div>
      </div>
      <div className="glass rounded-2xl divide-y divide-border">
        {isLoading && (
          <div className="p-6 text-sm text-muted-foreground text-center">Carregando…</div>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma pergunta cadastrada ainda.
          </div>
        )}
        {(data ?? []).map((q) => (
          <div key={q.id} className="p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                #{q.sort_order} · {q.answers.length} alternativas
              </p>
              <p className="text-sm">{q.text}</p>
            </div>
            <button
              className="cursor-pointer text-muted-foreground hover:text-primary"
              onClick={() => {
                setDraft(q);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="cursor-pointer text-muted-foreground hover:text-destructive"
              onClick={() => setToDelete({ id: q.id, text: q.text })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          </DialogHeader>
          {draft && <QuestionDraftForm draft={draft} setDraft={setDraft} />}
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="cursor-pointer bg-gradient-brand text-white border-0"
              disabled={save.isPending || !draft?.text.trim()}
              onClick={() => draft && save.mutate(draft)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir pergunta?"
        description={toDelete?.text}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />

      <GenerateQuestionsDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        room={{
          title: room.title,
          theme: room.theme,
          ageMin: room.age_min,
          ageMax: room.age_max,
          hint: room.generation_hint ?? null,
        }}
        saving={saveGenerated.isPending}
        onSave={(items) => saveGenerated.mutate(items)}
      />
    </section>
  );
}

function QuestionDraftForm({
  draft,
  setDraft,
}: {
  draft: Question;
  setDraft: (q: Question) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto da pergunta*</Label>
        <Textarea
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Ordem</Label>
        <Input
          type="number"
          value={draft.sort_order}
          onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          className="w-24"
        />
      </div>
      <div className="space-y-2">
        <Label>Alternativas (até 4)</Label>
        {draft.answers.map((a, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="🌟"
              value={a.emoji}
              onChange={(e) => {
                const arr = [...draft.answers];
                arr[i] = { ...arr[i], emoji: e.target.value };
                setDraft({ ...draft, answers: arr });
              }}
              className="w-16"
            />
            <Input
              placeholder={`Alternativa ${i + 1}`}
              value={a.label}
              onChange={(e) => {
                const arr = [...draft.answers];
                arr[i] = { ...arr[i], label: e.target.value, sort_order: i };
                setDraft({ ...draft, answers: arr });
              }}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}