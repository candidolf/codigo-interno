import { supabase } from "@/integrations/supabase/client";

export type AiAgent = {
  id: string;
  name: string;
  kind: "question_generator" | "report_analyzer" | "room_report_analyzer";
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
  content?: string;
  parsed?: unknown | null;
  background?: boolean;
  responseId?: string;
  status?: string;
  report?: unknown;
};

export async function runAgent(input: {
  action?: "run" | "check_report";
  agentId?: string;
  agentKind?: AiAgent["kind"];
  variables?: Record<string, unknown>;
  /** Obrigatório para usuários não-admin: compra à qual a execução se refere. */
  purchaseId?: string;
  /** Relatórios são iniciados em background e acompanhados por polling. */
  background?: boolean;
}): Promise<RunAgentResult> {
  const { data, error } = await supabase.functions.invoke("ef_ai_agent", {
    body: input,
  });
  if (error) {
    // Tenta extrair a mensagem retornada pela função
    let detail = error.message;
    const ctx = (error as unknown as { context?: { json?: () => Promise<unknown> } }).context;
    try {
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body && typeof body === "object" && "error" in body) {
          detail = String(body.error);
        }
      }
    } catch {
      /* ignora */
    }
    throw new Error(detail || "Falha ao executar o agente de IA");
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String(data.error));
  }
  return data as RunAgentResult;
}

export type GeneratedQuestion = {
  texto: string;
  alternativas: { emoji?: string; label: string }[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function parseGeneratedQuestions(result: RunAgentResult): GeneratedQuestion[] {
  let payload: unknown = result.parsed;
  if (!payload) {
    if (!result.content?.trim()) {
      throw new Error(
        "O agente retornou uma resposta vazia. Aumente o limite de tokens do agente ou troque o modelo (ex.: gpt-5.6-luna).",
      );
    }
    try {
      payload = JSON.parse(result.content);
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (!match)
        throw new Error(
          `O agente não retornou perguntas em formato válido (JSON). Resposta: ${result.content.slice(0, 160)}`,
        );
      payload = JSON.parse(match[0]);
    }
  }
  const payloadRecord = asRecord(payload);
  const list = payloadRecord?.perguntas ?? payloadRecord?.questions ?? payload;
  if (!Array.isArray(list)) throw new Error("O agente não retornou uma lista de perguntas.");
  const questions: GeneratedQuestion[] = list
    .map((question) => {
      const q = asRecord(question);
      const rawAnswers = q?.alternativas ?? q?.answers ?? [];
      const alternativas = (Array.isArray(rawAnswers) ? rawAnswers : [])
        .map((answer) => {
          const a = asRecord(answer);
          return {
            emoji: String(a?.emoji ?? "").trim(),
            label: String(a?.label ?? a?.texto ?? a?.text ?? "").trim(),
          };
        })
        .filter((answer) => answer.label);
      return {
        texto: String(q?.texto ?? q?.text ?? "").trim(),
        alternativas,
      };
    })
    .filter((q: GeneratedQuestion) => q.texto);
  if (!questions.length) throw new Error("O agente não retornou nenhuma pergunta.");
  for (const q of questions) {
    if (q.alternativas.length < 4) {
      throw new Error(
        `A pergunta "${q.texto.length > 60 ? q.texto.slice(0, 60) + "…" : q.texto}" tem ${q.alternativas.length} alternativa(s); eram esperadas 4. Gere novamente ou ajuste o agente.`,
      );
    }
  }
  return questions;
}
