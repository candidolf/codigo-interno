import { supabase } from "@/integrations/supabase/client";

export type AiAgent = {
  id: string;
  name: string;
  kind: "question_generator" | "report_analyzer";
  model: string;
  response_format: "text" | "json_object";
};

export async function fetchAgents(kind: AiAgent["kind"]): Promise<AiAgent[]> {
  const { data, error } = await supabase
    .from("ai_agents")
    .select("id, name, kind, model, response_format")
    .eq("kind", kind)
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as AiAgent[];
}

export type RunAgentResult = {
  agent: { id: string; name: string; kind: string; model: string };
  content: string;
  parsed: any | null;
};

export async function runAgent(input: {
  agentId?: string;
  agentKind?: AiAgent["kind"];
  variables?: Record<string, unknown>;
  /** Obrigatório para usuários não-admin: compra à qual a execução se refere. */
  purchaseId?: string;
}): Promise<RunAgentResult> {
  const { data, error } = await supabase.functions.invoke("ef_ai_agent", {
    body: input,
  });
  if (error) {
    // Tenta extrair a mensagem retornada pela função
    let detail = error.message;
    const ctx: any = (error as any).context;
    try {
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      }
    } catch {
      /* ignora */
    }
    throw new Error(detail || "Falha ao executar o agente de IA");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as RunAgentResult;
}

export type GeneratedQuestion = {
  texto: string;
  alternativas: { emoji?: string; label: string }[];
};

export function parseGeneratedQuestions(result: RunAgentResult): GeneratedQuestion[] {
  let payload: any = result.parsed;
  if (!payload) {
    try {
      payload = JSON.parse(result.content);
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("O agente não retornou perguntas em formato válido (JSON).");
      payload = JSON.parse(match[0]);
    }
  }
  const list = payload?.perguntas ?? payload?.questions ?? payload;
  if (!Array.isArray(list)) throw new Error("O agente não retornou uma lista de perguntas.");
  return list
    .map((q: any) => ({
      texto: String(q?.texto ?? q?.text ?? "").trim(),
      alternativas: (q?.alternativas ?? q?.answers ?? [])
        .map((a: any) => ({
          emoji: String(a?.emoji ?? "").trim(),
          label: String(a?.label ?? a?.texto ?? a?.text ?? "").trim(),
        }))
        .filter((a: any) => a.label),
    }))
    .filter((q: GeneratedQuestion) => q.texto);
}