// Edge Function: ef_ai_agent
// Executa um agente de IA cadastrado em public.ai_agents usando a OpenAI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function interpolate(tpl: string, vars: Record<string, unknown>) {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) =>
    vars[k] === undefined || vars[k] === null ? "" : String(vars[k]),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 500);

    // 1. Autenticação do chamador
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autorizado" }, 401);

    // 2. Payload
    const body = await req.json().catch(() => ({}));
    const agentId: string | undefined = body.agentId;
    const agentKind: string | undefined = body.agentKind;
    const variables: Record<string, unknown> = body.variables ?? {};
    const extraPrompt: string | undefined = body.prompt;
    if (!agentId && !agentKind) {
      return json({ error: "Informe agentId ou agentKind" }, 400);
    }

    // 3. Busca do agente
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let q = admin.from("ai_agents").select("*").eq("active", true).limit(1);
    q = agentId ? q.eq("id", agentId) : q.eq("kind", agentKind!);
    const { data: agent, error: agentErr } = await q.maybeSingle();
    if (agentErr) return json({ error: agentErr.message }, 500);
    if (!agent) return json({ error: "Agente não encontrado ou inativo" }, 404);

    // 4. Montagem do prompt
    const userContent =
      extraPrompt ??
      interpolate(agent.user_prompt_template ?? "", variables) ??
      "";
    if (!userContent.trim()) return json({ error: "Prompt do usuário vazio" }, 400);

    // 5. Chamada OpenAI
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model,
        temperature: Number(agent.temperature),
        max_tokens: agent.max_tokens,
        ...(agent.response_format === "json_object"
          ? { response_format: { type: "json_object" } }
          : {}),
        messages: [
          { role: "system", content: agent.system_prompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 401) return json({ error: "Chave da OpenAI inválida", detail }, 401);
      if (res.status === 429) return json({ error: "Limite de uso da OpenAI atingido", detail }, 429);
      return json({ error: "Falha na OpenAI", detail }, res.status);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";

    return json({
      agent: { id: agent.id, name: agent.name, kind: agent.kind, model: agent.model },
      content,
      parsed:
        agent.response_format === "json_object"
          ? (() => {
              try {
                return JSON.parse(content);
              } catch {
                return null;
              }
            })()
          : null,
      usage: data?.usage ?? null,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});