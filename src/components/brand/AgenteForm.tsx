import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrandHeader } from "./BrandHeader";
import { GradientButton } from "./GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export type AiAgent = {
  id: string;
  name: string;
  kind: "question_generator" | "report_analyzer";
  model: string;
  system_prompt: string;
  user_prompt_template: string | null;
  temperature: number;
  max_tokens: number;
  response_format: "text" | "json_object";
  active: boolean;
  sort_order: number;
};

const MODELS = [
  {
    value: "gpt-5.6-sol",
    label: "Sol",
    description: "Mais forte para raciocínio, código e tarefas complexas.",
  },
  {
    value: "gpt-5.6-terra",
    label: "Terra",
    description: "Melhor equilíbrio entre qualidade e custo.",
  },
  {
    value: "gpt-5.6-luna",
    label: "Luna",
    description: "Mais econômica para tarefas simples e alto volume.",
  },
];

export function AgenteForm({ agent }: { agent?: AiAgent | null }) {
  const editing = !!agent;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: agent?.name ?? "",
    kind: agent?.kind ?? "question_generator",
    model: agent?.model ?? "gpt-5.6-terra",
    system_prompt: agent?.system_prompt ?? "",
    user_prompt_template: agent?.user_prompt_template ?? "",
    temperature: agent?.temperature ?? 0.7,
    max_tokens: agent?.max_tokens ?? 2000,
    response_format: agent?.response_format ?? "text",
    active: agent?.active ?? true,
    sort_order: agent?.sort_order ?? 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_prompt_template: form.user_prompt_template || null };
      if (editing) {
        const { error } = await supabase.from("ai_agents").update(payload).eq("id", agent!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_agents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Agente salvo");
      qc.invalidateQueries({ queryKey: ["admin-ai-agents"] });
      navigate({ to: "/admin/agentes" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
        <Link
          to="/admin/agentes"
          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
        >
          ← Agentes de IA
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">
          {editing ? "Editar agente" : "Novo agente"}
        </h1>

        <form
          className="glass rounded-2xl p-4 sm:p-6 mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Nome*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))}
                className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
              >
                <option value="question_generator">Gerador de perguntas</option>
                <option value="report_analyzer">Analista de relatório</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <select
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
                required
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {MODELS.find((m) => m.value === form.model)?.description ??
                  "Selecione um dos modelos disponíveis."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt do sistema*</Label>
            <Textarea
              rows={6}
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Template do prompt do usuário</Label>
            <Textarea
              rows={6}
              value={form.user_prompt_template}
              onChange={(e) => setForm((f) => ({ ...f, user_prompt_template: e.target.value }))}
              placeholder="Use variáveis no formato {{sala}}, {{respostas}}…"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis entre chaves duplas são substituídas na execução.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Temperatura</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. de tokens</Label>
              <Input
                type="number"
                value={form.max_tokens}
                onChange={(e) => setForm((f) => ({ ...f, max_tokens: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Formato da resposta</Label>
              <select
                value={form.response_format}
                onChange={(e) => setForm((f) => ({ ...f, response_format: e.target.value as any }))}
                className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
              >
                <option value="text">Texto</option>
                <option value="json_object">JSON</option>
              </select>
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
            <span className="text-sm">Agente ativo</span>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <GradientButton type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar agente"}
            </GradientButton>
            <Link
              to="/admin/agentes"
              className="cursor-pointer px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
