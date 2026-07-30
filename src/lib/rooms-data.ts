import { supabase } from "@/integrations/supabase/client";
import type { Theme } from "@/data/mock";

export type DbAnswer = { id: string; label: string; emoji: string };
export type DbQuestion = {
  id: string;
  roomId: string;
  roomSlug: string;
  text: string;
  sortOrder: number;
  answers: DbAnswer[];
};
export type DbRoom = {
  id: string;
  slug: string;
  title: string;
  theme: Theme;
  description: string;
  ageMin: number;
  ageMax: number;
  sortOrder: number;
  generationHint: string | null;
};

export async function fetchActiveRooms(): Promise<DbRoom[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, slug, title, theme, description, age_min, age_max, sort_order, generation_hint")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    theme: r.theme as Theme,
    description: r.description ?? "",
    ageMin: r.age_min,
    ageMax: r.age_max,
    sortOrder: r.sort_order,
    generationHint: r.generation_hint ?? null,
  }));
}

export async function fetchQuestionsForRooms(rooms: DbRoom[]): Promise<DbQuestion[]> {
  if (!rooms.length) return [];
  const ids = rooms.map((r) => r.id);
  const { data: qs, error } = await supabase
    .from("questions")
    .select("id, room_id, text, sort_order")
    .in("room_id", ids)
    .order("sort_order");
  if (error) throw error;
  const qIds = (qs ?? []).map((q: any) => q.id);
  const { data: ans } = qIds.length
    ? await supabase
        .from("answers")
        .select("id, question_id, label, emoji, sort_order")
        .in("question_id", qIds)
        .order("sort_order")
    : { data: [] as any[] };
  const byQ = new Map<string, DbAnswer[]>();
  (ans ?? []).forEach((a: any) => {
    const arr = byQ.get(a.question_id) ?? [];
    arr.push({ id: a.id, label: a.label, emoji: a.emoji ?? "" });
    byQ.set(a.question_id, arr);
  });
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  return (qs ?? []).map((q: any) => ({
    id: q.id,
    roomId: q.room_id,
    roomSlug: roomById.get(q.room_id)?.slug ?? "",
    text: q.text,
    sortOrder: q.sort_order,
    answers: byQ.get(q.id) ?? [],
  }));
}

/**
 * Uma única consulta aninhada (rooms -> questions -> answers) em vez de
 * três idas sequenciais ao banco.
 */
export async function fetchRoomsWithQuestions(): Promise<{
  rooms: DbRoom[];
  questions: DbQuestion[];
}> {
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, slug, title, theme, description, age_min, age_max, sort_order, generation_hint, questions(id, text, sort_order, answers(id, label, emoji, sort_order))",
    )
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;

  const rooms: DbRoom[] = [];
  const questions: DbQuestion[] = [];

  for (const r of (data ?? []) as any[]) {
    rooms.push({
      id: r.id,
      slug: r.slug,
      title: r.title,
      theme: r.theme as Theme,
      description: r.description ?? "",
      ageMin: r.age_min,
      ageMax: r.age_max,
      sortOrder: r.sort_order,
      generationHint: r.generation_hint ?? null,
    });
    const qs = ((r.questions ?? []) as any[]).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    for (const q of qs) {
      questions.push({
        id: q.id,
        roomId: r.id,
        roomSlug: r.slug,
        text: q.text,
        sortOrder: q.sort_order,
        answers: ((q.answers ?? []) as any[])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((a) => ({ id: a.id, label: a.label, emoji: a.emoji ?? "" })),
      });
    }
  }

  return { rooms, questions };
}

export async function persistAnswer(input: {
  purchaseId: string;
  roomId: string;
  questionId: string;
  answerId: string | null;
  answerLabel: string;
  otherText?: string | null;
}) {
  const { error } = await supabase.from("test_answers").upsert(
    {
      purchase_id: input.purchaseId,
      room_id: input.roomId,
      question_id: input.questionId,
      answer_id: input.answerId,
      answer_label: input.answerLabel,
      other_text: input.otherText ?? null,
    },
    { onConflict: "purchase_id,question_id" },
  );
  if (error) throw error;
}