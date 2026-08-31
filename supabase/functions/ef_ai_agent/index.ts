// Edge Function: ef_ai_agent
// Executa agentes cadastrados usando a Responses API da OpenAI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MODELS = new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]);
const REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh", "max"]);

const METRIC_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    nome: { type: "string" },
    percentual: { type: "number", minimum: 0, maximum: 100 },
    classificacao: { type: "string" },
    descricao: { type: "string" },
  },
  required: ["nome", "percentual", "classificacao", "descricao"],
};

const TITLED_DESCRIPTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    titulo: { type: "string" },
    descricao: { type: "string" },
  },
  required: ["titulo", "descricao"],
};

const ROOM_REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_version: { type: "integer", enum: [1] },
    nome: { type: "string" },
    idade: { type: "string" },
    revelacoes: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titulo: { type: "string" },
          codigo: { type: "string", pattern: "^[A-Z0-9]{3}$" },
          texto: { type: "string" },
          move: { type: "string" },
          energia: { type: "string" },
          trava: { type: "string" },
        },
        required: ["titulo", "codigo", "texto", "move", "energia", "trava"],
      },
    },
  },
  required: ["schema_version", "nome", "idade", "revelacoes"],
};

const FINAL_REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema_version: { type: "integer", enum: [1] },
    identidade: {
      type: "object",
      additionalProperties: false,
      properties: {
        titulo: { type: "string" },
        subtitulo: { type: "string" },
        descricao: { type: "string" },
        arquetipos_secundarios: { type: "array", items: { type: "string" } },
        temperamento: { type: "string" },
        arquetipo: { type: "string" },
        inteligencia: { type: "string" },
        raridade: { type: "string" },
        codigo: { type: "string" },
      },
      required: [
        "titulo",
        "subtitulo",
        "descricao",
        "arquetipos_secundarios",
        "temperamento",
        "arquetipo",
        "inteligencia",
        "raridade",
        "codigo",
      ],
    },
    mapa_psicologico: {
      type: "object",
      additionalProperties: false,
      properties: {
        temperamentos: { type: "array", items: METRIC_JSON_SCHEMA },
        inteligencias: { type: "array", items: METRIC_JSON_SCHEMA },
      },
      required: ["temperamentos", "inteligencias"],
    },
    sombra_e_dom: {
      type: "object",
      additionalProperties: false,
      properties: {
        sombra: { type: "string" },
        dom_oculto: { type: "string" },
        fechamento: { type: "string" },
      },
      required: ["sombra", "dom_oculto", "fechamento"],
    },
    como_funciona: {
      type: "object",
      additionalProperties: false,
      properties: {
        energiza: { type: "array", items: { type: "string" } },
        drena: { type: "array", items: { type: "string" } },
        aprende_melhor: { type: "array", items: TITLED_DESCRIPTION_JSON_SCHEMA },
      },
      required: ["energiza", "drena", "aprende_melhor"],
    },
    profissoes_estilo_de_vida: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titulo: { type: "string" },
          compatibilidade: { type: "number" },
          descricao: { type: "string" },
          estilos_de_vida: { type: "array", items: TITLED_DESCRIPTION_JSON_SCHEMA },
          areas: { type: "array", items: { type: "string" } },
          faixas_salariais: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                nivel: { type: "string" },
                faixa: { type: "string" },
                observacao: { type: "string" },
              },
              required: ["nivel", "faixa", "observacao"],
            },
          },
        },
        required: [
          "titulo",
          "compatibilidade",
          "descricao",
          "estilos_de_vida",
          "areas",
          "faixas_salariais",
        ],
      },
    },
    desenvolvimento: { type: "array", items: TITLED_DESCRIPTION_JSON_SCHEMA },
    missao_12_meses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          numero: { type: "integer" },
          titulo: { type: "string" },
          descricao: { type: "string" },
        },
        required: ["numero", "titulo", "descricao"],
      },
    },
    manual_dos_pais: {
      type: "object",
      additionalProperties: false,
      properties: {
        como_aprende: { type: "string" },
        reage_sob_pressao: { type: "string" },
        linguagem_que_chega: { type: "string" },
        fazer: { type: "array", items: { type: "string" } },
        evitar: { type: "array", items: { type: "string" } },
      },
      required: ["como_aprende", "reage_sob_pressao", "linguagem_que_chega", "fazer", "evitar"],
    },
    mensagem_final: { type: "string" },
    card_identidade: {
      type: "object",
      additionalProperties: false,
      properties: {
        titulo: { type: "string" },
        subtitulo: { type: "string" },
        frase: { type: "string" },
        tracos: { type: "array", items: { type: "string" } },
        metricas: { type: "array", items: METRIC_JSON_SCHEMA },
      },
      required: ["titulo", "subtitulo", "frase", "tracos", "metricas"],
    },
  },
  required: [
    "schema_version",
    "identidade",
    "mapa_psicologico",
    "sombra_e_dom",
    "como_funciona",
    "profissoes_estilo_de_vida",
    "desenvolvimento",
    "missao_12_meses",
    "manual_dos_pais",
    "mensagem_final",
    "card_identidade",
  ],
};

const QUESTIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    perguntas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          texto: { type: "string" },
          alternativas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { emoji: { type: "string" }, label: { type: "string" } },
              required: ["emoji", "label"],
            },
          },
        },
        required: ["texto", "alternativas"],
      },
    },
  },
  required: ["perguntas"],
};

type AdminClient = ReturnType<typeof createClient>;

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

function extractOutputText(data: Record<string, any>): string {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

function extractRefusal(data: Record<string, any>): string | null {
  for (const item of data.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === "refusal" && typeof part.refusal === "string") return part.refusal;
    }
  }
  return null;
}

function usageFields(data: Record<string, any>) {
  const usage = data?.usage ?? {};
  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    reasoning_tokens: usage.output_tokens_details?.reasoning_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
  };
}

function responseFailure(data: Record<string, any>): string {
  return (
    data?.error?.message ??
    extractRefusal(data) ??
    (data?.incomplete_details?.reason === "max_output_tokens"
      ? "O modelo atingiu o limite de tokens antes de concluir o relatório."
      : null) ??
    `A OpenAI encerrou a geração com status ${String(data?.status ?? "desconhecido")}.`
  );
}

async function openAIError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message ?? raw;
  } catch {
    return raw || `Falha na OpenAI (HTTP ${res.status})`;
  }
}

function structuredFormat(kind: string, responseFormat: string, roomReport = false) {
  if (kind === "report_analyzer" && !roomReport) {
    return {
      type: "json_schema",
      name: "final_report",
      strict: true,
      schema: FINAL_REPORT_JSON_SCHEMA,
    };
  }
  if (kind === "room_report_analyzer" || roomReport) {
    return {
      type: "json_schema",
      name: "room_report",
      strict: true,
      schema: ROOM_REPORT_JSON_SCHEMA,
    };
  }
  if (responseFormat !== "json_object") return { type: "text" };
  return {
    type: "json_schema",
    name: "generated_questions",
    strict: true,
    schema: QUESTIONS_JSON_SCHEMA,
  };
}

async function safetyIdentifier(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ageFromBirth(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const date = new Date(`${birth}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const month = now.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < date.getUTCDate())) age--;
  return age;
}

async function buildReportVariables(admin: AdminClient, purchaseId: string, roomSlug?: string) {
  const { data: purchase, error: purchaseError } = await admin
    .from("test_purchases")
    .select("id, testando_name, testando_user_id")
    .eq("id", purchaseId)
    .maybeSingle();
  if (purchaseError) throw new Error(purchaseError.message);
  if (!purchase) throw new Error("Compra não encontrada.");

  let idade: number | null = null;
  if (purchase.testando_user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("birth_date")
      .eq("id", purchase.testando_user_id)
      .maybeSingle();
    idade = ageFromBirth(profile?.birth_date);
  }

  const { data, error } = await admin
    .from("test_answers")
    .select("answer_label, other_text, questions(text, sort_order), rooms(slug, title, sort_order)")
    .eq("purchase_id", purchaseId);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Nenhuma resposta encontrada para este teste.");

  type RoomEntry = { order: number; items: { order: number; line: string }[] };
  const byRoom = new Map<string, RoomEntry>();
  for (const row of data as any[]) {
    if (roomSlug && row.rooms?.slug !== roomSlug) continue;
    const roomTitle = row.rooms?.title ?? "Sala";
    const entry = byRoom.get(roomTitle) ?? { order: row.rooms?.sort_order ?? 0, items: [] };
    const answer = row.other_text?.trim()
      ? `${row.answer_label} (${row.other_text.trim()})`
      : row.answer_label;
    entry.items.push({
      order: row.questions?.sort_order ?? 0,
      line: `- P: ${row.questions?.text ?? ""}\n  R: ${answer}`,
    });
    byRoom.set(roomTitle, entry);
  }
  const respostas = [...byRoom.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(
      ([title, value]) =>
        `### ${title}\n${value.items
          .sort((a, b) => a.order - b.order)
          .map((item) => item.line)
          .join("\n")}`,
    )
    .join("\n\n");
  if (!respostas)
    throw new Error(
      roomSlug
        ? "Nenhuma resposta encontrada para esta sala."
        : "Nenhuma resposta encontrada para este teste.",
    );
  return {
    nome: purchase.testando_name ?? "Testando",
    idade: idade === null ? "não informada" : String(idade),
    respostas,
  };
}

async function selectReport(admin: AdminClient, purchaseId: string) {
  const { data, error } = await admin
    .from("test_reports")
    .select("*")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function markReportError(
  admin: AdminClient,
  purchaseId: string,
  generationId: string,
  message: string,
  responseData?: Record<string, any>,
) {
  const report = await selectReport(admin, purchaseId);
  const duration = report?.started_at
    ? Math.max(0, Date.now() - new Date(report.started_at).getTime())
    : null;
  await admin
    .from("test_reports")
    .update({
      status: "erro",
      error: message.slice(0, 4000),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      finish_reason:
        responseData?.incomplete_details?.reason ?? responseData?.status ?? "request_error",
      ...(responseData ? usageFields(responseData) : {}),
    })
    .eq("purchase_id", purchaseId)
    .eq("generation_id", generationId)
    .eq("status", "gerando");
}

async function finalizeReport(
  admin: AdminClient,
  purchaseId: string,
  generationId: string,
  data: Record<string, any>,
) {
  if (data.status !== "completed") {
    if (["failed", "cancelled", "incomplete"].includes(data.status)) {
      await markReportError(admin, purchaseId, generationId, responseFailure(data), data);
    }
    return selectReport(admin, purchaseId);
  }
  const content = extractOutputText(data);
  if (!content.trim()) {
    await markReportError(admin, purchaseId, generationId, responseFailure(data), data);
    return selectReport(admin, purchaseId);
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    await markReportError(
      admin,
      purchaseId,
      generationId,
      "A OpenAI retornou JSON inválido.",
      data,
    );
    return selectReport(admin, purchaseId);
  }
  const requiredFinalSections = [
    "identidade",
    "mapa_psicologico",
    "sombra_e_dom",
    "como_funciona",
    "profissoes_estilo_de_vida",
    "desenvolvimento",
    "missao_12_meses",
    "manual_dos_pais",
    "mensagem_final",
    "card_identidade",
  ];
  if (parsed.schema_version !== 1 || requiredFinalSections.some((key) => !(key in parsed))) {
    await markReportError(
      admin,
      purchaseId,
      generationId,
      "Versão do relatório incompatível.",
      data,
    );
    return selectReport(admin, purchaseId);
  }
  const report = await selectReport(admin, purchaseId);
  const duration = report?.started_at
    ? Math.max(0, Date.now() - new Date(report.started_at).getTime())
    : null;
  const { error } = await admin
    .from("test_reports")
    .update({
      status: "pronto",
      content: JSON.stringify(parsed),
      schema_version: 1,
      error: null,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      finish_reason: "completed",
      ...usageFields(data),
    })
    .eq("purchase_id", purchaseId)
    .eq("generation_id", generationId)
    .eq("status", "gerando");
  if (error) throw new Error(error.message);
  await admin.from("test_purchases").update({ status: "concluido" }).eq("id", purchaseId);
  return selectReport(admin, purchaseId);
}

async function checkReport(admin: AdminClient, openaiKey: string, purchaseId: string) {
  const report = await selectReport(admin, purchaseId);
  if (!report) return json({ error: "Relatório não encontrado" }, 404);
  if (report.status !== "gerando" || !report.provider_response_id) return json({ report });

  const res = await fetch(`https://api.openai.com/v1/responses/${report.provider_response_id}`, {
    headers: { Authorization: `Bearer ${openaiKey}` },
  });
  if (!res.ok) {
    const detail = await openAIError(res);
    if (res.status >= 500 || res.status === 429) return json({ error: detail }, 503);
    await markReportError(admin, purchaseId, report.generation_id, detail);
    return json({ report: await selectReport(admin, purchaseId) });
  }
  const data = await res.json();
  return json({ report: await finalizeReport(admin, purchaseId, report.generation_id, data) });
}

async function saveRoomReport(
  admin: AdminClient,
  purchaseId: string,
  roomSlug: string,
  values: { status: "gerando" | "pronto" | "erro"; content?: string | null; error?: string | null },
) {
  const { data, error } = await admin
    .from("test_room_reports")
    .upsert(
      {
        purchase_id: purchaseId,
        room_slug: roomSlug,
        content: null,
        error: null,
        ...values,
      },
      { onConflict: "purchase_id,room_slug" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
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

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer "))
      return json({ error: "Não autorizado" }, 401);
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autorizado" }, 401);

    const requestBody = await req.json().catch(() => ({}));
    const action: string = requestBody.action ?? "run";
    const agentId: string | undefined = requestBody.agentId;
    const requestedAgentKind: string | undefined = requestBody.agentKind;
    const purchaseId: string | undefined = requestBody.purchaseId;
    const roomSlug: string | undefined = requestBody.roomSlug;
    const requestedVariables: Record<string, unknown> = requestBody.variables ?? {};
    const background = requestBody.background === true;
    const isRoomReport = action === "generate_room_report";
    const agentKind = isRoomReport ? "room_report_analyzer" : requestedAgentKind;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    let purchase: { id: string; master_id: string; testando_user_id: string | null } | null = null;
    if (purchaseId) {
      if (!/^[0-9a-f-]{36}$/i.test(purchaseId)) return json({ error: "Compra inválida" }, 400);
      const result = await admin
        .from("test_purchases")
        .select("id, master_id, testando_user_id")
        .eq("id", purchaseId)
        .maybeSingle();
      purchase = result.data;
      if (
        !purchase ||
        (!isAdmin &&
          purchase.master_id !== userData.user.id &&
          purchase.testando_user_id !== userData.user.id)
      ) {
        return json({ error: "Não autorizado" }, 403);
      }
    }

    if (isRoomReport && (!purchaseId || !roomSlug))
      return json({ error: "Informe purchaseId e roomSlug" }, 400);
    if (action === "check_report") {
      if (!purchaseId || !purchase) return json({ error: "Informe purchaseId" }, 400);
      return checkReport(admin, openaiKey, purchaseId);
    }
    if (!agentId && !agentKind) return json({ error: "Informe agentId ou agentKind" }, 400);
    if (!isAdmin && (!purchase || agentId || (agentKind !== "report_analyzer" && !isRoomReport)))
      return json({ error: "Não autorizado" }, 403);

    let query = admin.from("ai_agents").select("*").eq("active", true).order("sort_order").limit(1);
    query = agentId ? query.eq("id", agentId) : query.eq("kind", agentKind ?? "report_analyzer");
    const { data: agent, error: agentErr } = await query.maybeSingle();
    if (agentErr) return json({ error: agentErr.message }, 500);
    if (!agent) return json({ error: "Agente não encontrado ou inativo" }, 404);
    if (!isAdmin && agent.kind !== "report_analyzer" && agent.kind !== "room_report_analyzer")
      return json({ error: "Não autorizado" }, 403);

    const model = String(agent.model ?? "");
    if (!ALLOWED_MODELS.has(model))
      return json({ error: "Modelo de agente inválido. Use Sol, Terra ou Luna." }, 400);
    const isReport = agent.kind === "report_analyzer" || agent.kind === "room_report_analyzer";
    if (isReport && (!purchaseId || !purchase)) return json({ error: "Informe purchaseId" }, 400);
    const variables = isReport
      ? await buildReportVariables(admin, purchaseId!, isRoomReport ? roomSlug : undefined)
      : requestedVariables;
    const userContent = isRoomReport
      ? `Nome: ${variables.nome}\nIdade: ${variables.idade}\nSala: ${roomSlug}\n\nRespostas da sala:\n${variables.respostas}\n\nGere uma revelação acolhedora, específica e concisa para esta sala. O titulo deve ter no máximo 5 palavras. O codigo deve ter exatamente 3 caracteres alfanuméricos maiúsculos e nunca deve copiar uma resposta. O texto principal deve ter de 2 a 3 frases curtas. Cada campo move, energia e trava deve ter no máximo 25 palavras. Retorne somente JSON válido com schema_version 1, nome, idade e um único item em revelacoes contendo titulo, codigo, texto, move, energia e trava. Não use markdown.`
      : `Nome: ${variables.nome}\nIdade: ${variables.idade}\n\nPERGUNTAS E RESPOSTAS:\n${variables.respostas}\n\nGere o relatório final completo em português do Brasil, sem diagnóstico clínico e sem inventar fatos. Retorne somente JSON válido com schema_version 1 e estas chaves obrigatórias: identidade, mapa_psicologico, sombra_e_dom, como_funciona, profissoes_estilo_de_vida, desenvolvimento, missao_12_meses, manual_dos_pais, mensagem_final e card_identidade. Personalize todas as seções com base nas respostas.`;
    if (!userContent.trim()) return json({ error: "Prompt do usuário vazio" }, 400);

    let generationId: string | null = null;
    if (isReport && background && !isRoomReport) {
      const { data: claim, error: claimError } = await admin.rpc("claim_test_report_generation", {
        _purchase_id: purchaseId,
        _agent_id: agent.id,
        _model: model,
      });
      if (claimError) return json({ error: claimError.message }, 500);
      const claimed = Array.isArray(claim) ? claim[0] : claim;
      generationId = claimed?.generation_id ?? null;
      if (!claimed?.acquired) {
        return json({
          agent: { id: agent.id, name: agent.name, kind: agent.kind, model },
          background: true,
          status: "in_progress",
          report: await selectReport(admin, purchaseId!),
        });
      }
    }

    const effort = REASONING_EFFORTS.has(agent.reasoning_effort)
      ? agent.reasoning_effort
      : isReport
        ? "low"
        : "none";
    const recommendedMax = isRoomReport ? 4000 : isReport ? 16000 : 2048;
    const configuredMax = Number(agent.max_tokens) || (isReport ? recommendedMax : 6000);
    const maxOutputTokens = Math.min(128000, Math.max(configuredMax, recommendedMax));
    const openAIRequest: Record<string, unknown> = {
      model,
      instructions: agent.system_prompt,
      input: userContent,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort },
      text: {
        format: structuredFormat(agent.kind, agent.response_format, isRoomReport),
        verbosity: isRoomReport ? "low" : isReport ? "medium" : "low",
      },
      store: true,
      background: isReport && background && !isRoomReport,
      safety_identifier: await safetyIdentifier(userData.user.id),
      metadata: {
        agent_id: agent.id,
        agent_kind: agent.kind,
        ...(purchaseId ? { purchase_id: purchaseId } : {}),
        ...(roomSlug ? { room_slug: roomSlug } : {}),
      },
    };

    if (isRoomReport) {
      await saveRoomReport(admin, purchaseId!, roomSlug!, { status: "gerando" });
    }

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(openAIRequest),
      });
    } catch (error) {
      if (isRoomReport) {
        await saveRoomReport(admin, purchaseId!, roomSlug!, {
          status: "erro",
          error: error instanceof Error ? error.message : "Falha ao acessar a OpenAI.",
        });
      }
      throw error;
    }
    if (!res.ok) {
      const detail = await openAIError(res);
      if (generationId) await markReportError(admin, purchaseId!, generationId, detail);
      if (isRoomReport) {
        await saveRoomReport(admin, purchaseId!, roomSlug!, {
          status: "erro",
          error: detail.slice(0, 4000),
        });
      }
      if (res.status === 401) return json({ error: "Chave da OpenAI inválida" }, 401);
      if (res.status === 429) return json({ error: "Limite de uso da OpenAI atingido" }, 429);
      return json({ error: detail }, res.status);
    }

    const data = await res.json();
    if (isRoomReport) {
      if (data.status !== "completed") {
        const detail = responseFailure(data);
        await saveRoomReport(admin, purchaseId!, roomSlug!, {
          status: "erro",
          error: detail.slice(0, 4000),
        });
        return json({ error: detail }, 502);
      }
      const content = extractOutputText(data);
      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(content);
      } catch {
        await saveRoomReport(admin, purchaseId!, roomSlug!, {
          status: "erro",
          error: "A OpenAI retornou JSON inválido.",
        });
        return json({ error: "A OpenAI retornou JSON inválido." }, 502);
      }
      const report = await saveRoomReport(admin, purchaseId!, roomSlug!, {
        status: "pronto",
        content: JSON.stringify(parsed),
        error: null,
      });
      return json({ agent: { id: agent.id, name: agent.name, kind: agent.kind, model }, report });
    }
    if (isReport && background && generationId) {
      const { error: updateError } = await admin
        .from("test_reports")
        .update({
          provider_response_id: data.id,
          finish_reason: data.status,
          ...usageFields(data),
        })
        .eq("purchase_id", purchaseId!)
        .eq("generation_id", generationId)
        .eq("status", "gerando");
      if (updateError) return json({ error: updateError.message }, 500);
      const report =
        data.status === "completed"
          ? await finalizeReport(admin, purchaseId!, generationId, data)
          : await selectReport(admin, purchaseId!);
      return json({
        agent: { id: agent.id, name: agent.name, kind: agent.kind, model },
        background: true,
        responseId: data.id,
        status: data.status,
        report,
      });
    }

    if (data.status !== "completed") return json({ error: responseFailure(data) }, 502);
    const content = extractOutputText(data);
    if (!content.trim()) return json({ error: responseFailure(data) }, 502);
    let parsed: unknown = null;
    if (agent.response_format === "json_object") {
      try {
        parsed = JSON.parse(content);
      } catch {
        return json({ error: "A OpenAI retornou JSON inválido." }, 502);
      }
    }
    return json({
      agent: { id: agent.id, name: agent.name, kind: agent.kind, model },
      content,
      parsed,
      usage: data.usage ?? null,
      responseId: data.id,
      status: data.status,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
