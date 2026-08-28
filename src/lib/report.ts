import { supabase } from "@/integrations/supabase/client";
import { runAgent } from "@/lib/ai-agents";

export type TestReport = {
  id: string;
  purchase_id: string;
  agent_id: string | null;
  status: "gerando" | "pronto" | "erro";
  content: string | null;
  error: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  schema_version?: number;
  generation_id?: string | null;
  provider_response_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  finish_reason?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  total_tokens?: number | null;
};

async function fetchReportRow(purchaseId: string): Promise<TestReport | null> {
  const { data, error } = await supabase
    .from("test_reports")
    .select("*")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (error) throw error;
  return (data as TestReport | null) ?? null;
}

export async function fetchReport(
  purchaseId: string,
  refreshGeneration = true,
): Promise<TestReport | null> {
  const current = await fetchReportRow(purchaseId);
  if (!refreshGeneration || current?.status !== "gerando" || !current.provider_response_id) {
    return current;
  }

  try {
    const result = await runAgent({ action: "check_report", purchaseId });
    return (result.report as TestReport | null) ?? current;
  } catch {
    // Uma falha transitória de polling não deve apagar nem interromper a geração.
    return current;
  }
}

export async function generateReport(purchaseId: string): Promise<TestReport> {
  const result = await runAgent({
    agentKind: "report_analyzer",
    purchaseId,
    background: true,
  });
  const report = result.report as TestReport | undefined;
  if (report) return report;

  const current = await fetchReport(purchaseId, false);
  if (!current) throw new Error("A geração foi iniciada, mas o relatório não foi encontrado.");
  return current;
}
