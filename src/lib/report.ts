import { supabase } from "@/integrations/supabase/client";
import { runAgent } from "@/lib/ai-agents";

export type TestReport = {
  id: string;
  purchase_id: string;
  status: "gerando" | "pronto" | "erro";
  content: string | null;
  error: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export function ageFromBirth(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export async function fetchReport(purchaseId: string): Promise<TestReport | null> {
  const { data, error } = await supabase
    .from("test_reports")
    .select("*")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (error) throw error;
  return (data as TestReport | null) ?? null;
}

export async function buildAnswersSummary(purchaseId: string): Promise<string> {
  const { data, error } = await supabase
    .from("test_answers")
    .select("answer_label, other_text, questions(text, sort_order), rooms(title, sort_order)")
    .eq("purchase_id", purchaseId);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (!rows.length) throw new Error("Nenhuma resposta encontrada para este teste.");

  type RoomEntry = { order: number; items: { order: number; line: string }[] };
  const byRoom = new Map<string, RoomEntry>();
  for (const r of rows) {
    const roomTitle = r.rooms?.title ?? "Sala";
    const entry: RoomEntry = byRoom.get(roomTitle) ?? { order: r.rooms?.sort_order ?? 0, items: [] };
    const answer = r.other_text?.trim() ? `${r.answer_label} (${r.other_text.trim()})` : r.answer_label;
    entry.items.push({
      order: r.questions?.sort_order ?? 0,
      line: `- P: ${r.questions?.text ?? ""}\n  R: ${answer}`,
    });
    byRoom.set(roomTitle, entry);
  }
  return [...byRoom.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(
      ([title, v]) =>
        `### ${title}\n${v.items.sort((a, b) => a.order - b.order).map((i) => i.line).join("\n")}`,
    )
    .join("\n\n");
}

export async function generateReport(purchaseId: string): Promise<TestReport> {
  const { data: purchase, error: pErr } = await supabase
    .from("test_purchases")
    .select("id, testando_name, testando_user_id")
    .eq("id", purchaseId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!purchase) throw new Error("Compra não encontrada.");

  let idade: number | null = null;
  if (purchase.testando_user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date")
      .eq("id", purchase.testando_user_id)
      .maybeSingle();
    idade = ageFromBirth(profile?.birth_date);
  }

  const respostas = await buildAnswersSummary(purchaseId);

  await supabase
    .from("test_reports")
    .upsert({ purchase_id: purchaseId, status: "gerando", error: null }, { onConflict: "purchase_id" });

  try {
    const result = await runAgent({
      agentKind: "report_analyzer",
      purchaseId,
      variables: {
        nome: purchase.testando_name ?? "Testando",
        idade: idade ?? "não informada",
        respostas,
      },
    });
    const { data, error } = await supabase
      .from("test_reports")
      .upsert(
        {
          purchase_id: purchaseId,
          agent_id: result.agent?.id ?? null,
          model: result.agent?.model ?? null,
          status: "pronto",
          content: result.content,
          error: null,
        },
        { onConflict: "purchase_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("test_purchases").update({ status: "concluido" }).eq("id", purchaseId);
    return data as TestReport;
  } catch (e: any) {
    await supabase
      .from("test_reports")
      .upsert(
        { purchase_id: purchaseId, status: "erro", error: e?.message ?? "Erro desconhecido" },
        { onConflict: "purchase_id" },
      );
    throw e;
  }
}