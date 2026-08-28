// Edge Function: ef_ai_agent
// Executa um agente de IA cadastrado em public.ai_agents usando a OpenAI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MODELS = new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]);

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
    if (!agentId && !agentKind) {
      return json({ error: "Informe agentId ou agentKind" }, 400);
    }

    // 3. Busca do agente
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3a. Autorização por contexto
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    const purchaseId: string | undefined = body.purchaseId;
    if (!isAdmin) {
      // Usuários não-admin só podem executar o agente vinculado a uma compra própria.
      if (!purchaseId || !/^[0-9a-f-]{36}$/i.test(purchaseId)) {
        return json({ error: "Não autorizado" }, 403);
      }
      const { data: purchase } = await admin
        .from("test_purchases")
        .select("id, master_id, testando_user_id")
        .eq("id", purchaseId)
        .maybeSingle();
      if (
        !purchase ||
        (purchase.master_id !== userData.user.id && purchase.testando_user_id !== userData.user.id)
      ) {
        return json({ error: "Não autorizado" }, 403);
      }
      // Não-admins só rodam o analisador de relatório.
      if (agentKind && agentKind !== "report_analyzer") {
        return json({ error: "Não autorizado" }, 403);
      }
      if (agentId) return json({ error: "Não autorizado" }, 403);
    }

    let q = admin.from("ai_agents").select("*").eq("active", true).limit(1);
    q = agentId ? q.eq("id", agentId) : q.eq("kind", agentKind!);
    const { data: agent, error: agentErr } = await q.maybeSingle();
    if (agentErr) return json({ error: agentErr.message }, 500);
    if (!agent) return json({ error: "Agente não encontrado ou inativo" }, 404);
    if (!isAdmin && agent.kind !== "report_analyzer") {
      return json({ error: "Não autorizado" }, 403);
    }

    // 4. Montagem do prompt
    // Somente o template cadastrado é usado — sem prompt livre vindo do cliente.
    const userContent = interpolate(agent.user_prompt_template ?? "", variables);
    if (!userContent.trim()) return json({ error: "Prompt do usuário vazio" }, 400);

    // 5. Chamada OpenAI
    const model: string = String(agent.model ?? "");
    if (!ALLOWED_MODELS.has(model)) {
      return json({ error: "Modelo de agente inválido. Use Sol, Terra ou Luna." }, 400);
    }
    // Modelos de raciocínio (o1/o3/o4/gpt-5) exigem max_completion_tokens e não aceitam temperature.
    const isReasoning = /^(o\d|gpt-5)/i.test(model);

    const baseBody: Record<string, unknown> = {
      model,
      ...(agent.response_format === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
      messages: [
        { role: "system", content: agent.system_prompt },
        { role: "user", content: userContent },
      ],
    };

    let useCompletionTokens = isReasoning;
    let sendTemperature = !isReasoning;

    const callOpenAI = (retryNote?: string) => {
      const body: Record<string, unknown> = { ...baseBody };
      if (retryNote) {
        body.messages = [
          ...(baseBody.messages as { role: string; content: string }[]),
          { role: "user", content: retryNote },
        ];
      }
      if (agent.max_tokens) {
        if (useCompletionTokens) {
          // Modelos de raciocínio gastam tokens "pensando"; sem folga o content volta vazio.
          body.max_completion_tokens = Math.max(Number(agent.max_tokens), 4000);
        } else body.max_tokens = agent.max_tokens;
      } else if (useCompletionTokens) {
        body.max_completion_tokens = 4000;
      }
      if (sendTemperature) body.temperature = Number(agent.temperature);
      return fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    };

    let res = await callOpenAI();

    // Retry adaptativo para parâmetros não suportados pelo modelo.
    for (let attempt = 0; attempt < 2 && !res.ok; attempt++) {
      const detail = await res.clone().text();
      let changed = false;
      if (/max_tokens.*not supported|Unsupported parameter: 'max_tokens'/i.test(detail)) {
        if (!useCompletionTokens) {
          useCompletionTokens = true;
          changed = true;
        }
      }
      if (/temperature/i.test(detail) && /unsupported|not supported/i.test(detail)) {
        if (sendTemperature) {
          sendTemperature = false;
          changed = true;
        }
      }
      if (!changed) break;
      res = await callOpenAI();
    }

    if (!res.ok) {
      const detail = await res.text();
      let message = "Falha na OpenAI";
      try {
        const parsedErr = JSON.parse(detail);
        if (parsedErr?.error?.message) message = parsedErr.error.message;
      } catch {
        /* mantém a mensagem padrão */
      }
      if (res.status === 401) return json({ error: "Chave da OpenAI inválida", detail }, 401);
      if (res.status === 429)
        return json({ error: "Limite de uso da OpenAI atingido", detail }, 429);
      return json({ error: message, detail }, res.status);
    }

    let data = await res.json();
    let content: string = data?.choices?.[0]?.message?.content ?? "";
    const finishReason: string = data?.choices?.[0]?.finish_reason ?? "";

    // Retry único para JSON inválido: alguns modelos cercam a resposta com texto/marcação.
    if (agent.response_format === "json_object" && content.trim()) {
      try {
        JSON.parse(content);
      } catch {
        const retryRes = await callOpenAI(
          "Sua resposta anterior não era um JSON válido. Responda apenas com o JSON no formato pedido, sem texto antes ou depois.",
        );
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          content = retryData?.choices?.[0]?.message?.content ?? "";
          data = retryData;
        }
      }
    }

    if (!content.trim()) {
      return json(
        {
          error:
            finishReason === "length"
              ? "O modelo atingiu o limite de tokens antes de responder. Aumente o limite de tokens do agente ou ajuste o limite de tokens configurado."
              : "O modelo retornou uma resposta vazia. Tente novamente ou troque o modelo do agente.",
          finish_reason: finishReason,
          usage: data?.usage ?? null,
        },
        502,
      );
    }

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
