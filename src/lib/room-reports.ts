import { supabase } from "@/integrations/supabase/client";
import { parseRoomReportDocument, type RoomReportDocument } from "@/lib/report-schema";

export type RoomReport = {
  id: string;
  purchase_id: string;
  room_slug: string;
  status: "gerando" | "pronto" | "erro";
  content: string | null;
  error: string | null;
};

export async function fetchRoomReport(purchaseId: string, roomSlug: string) {
  const { data, error } = await supabase
    .from("test_room_reports")
    .select("*")
    .eq("purchase_id", purchaseId)
    .eq("room_slug", roomSlug)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomReport | null) ?? null;
}

export async function generateRoomReport(purchaseId: string, roomSlug: string) {
  const { data, error } = await supabase.functions.invoke("ef_ai_agent", {
    body: { action: "generate_room_report", purchaseId, roomSlug, background: true },
  });
  if (error) throw error;
  return data as { report: RoomReport | null };
}

export function parseRoomReport(content: string | null): RoomReportDocument | null {
  if (!content) return null;
  try {
    return parseRoomReportDocument(content);
  } catch {
    return null;
  }
}
