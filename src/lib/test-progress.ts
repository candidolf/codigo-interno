export type RoomProgressState = {
  answers: Record<string, string>;
  otherTexts: Record<string, string>;
  completedAt: string | null;
};

export type ProgressState = {
  rooms: Record<string, RoomProgressState>;
  startedRoom: string | null;
};

const KEY = (purchaseId: string) => `pg:test:${purchaseId}`;

const empty = (): ProgressState => ({ rooms: {}, startedRoom: null });

export function loadProgress(purchaseId: string): ProgressState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY(purchaseId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressState;
    return { rooms: parsed.rooms ?? {}, startedRoom: parsed.startedRoom ?? null };
  } catch {
    return empty();
  }
}

function save(purchaseId: string, state: ProgressState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(purchaseId), JSON.stringify(state));
}

function ensureRoom(state: ProgressState, slug: string): RoomProgressState {
  if (!state.rooms[slug]) {
    state.rooms[slug] = { answers: {}, otherTexts: {}, completedAt: null };
  }
  return state.rooms[slug];
}

export function startRoom(purchaseId: string, slug: string): ProgressState {
  const state = loadProgress(purchaseId);
  ensureRoom(state, slug);
  if (!state.startedRoom || state.rooms[state.startedRoom]?.completedAt) {
    state.startedRoom = slug;
  }
  save(purchaseId, state);
  return state;
}

export function saveAnswer(
  purchaseId: string,
  slug: string,
  questionId: string,
  answerId: string,
  otherText?: string,
) {
  const state = loadProgress(purchaseId);
  const room = ensureRoom(state, slug);
  room.answers[questionId] = answerId;
  if (answerId === "other" && otherText !== undefined) {
    room.otherTexts[questionId] = otherText;
  }
  save(purchaseId, state);
}

export function completeRoom(purchaseId: string, slug: string) {
  const state = loadProgress(purchaseId);
  const room = ensureRoom(state, slug);
  room.completedAt = new Date().toISOString();
  if (state.startedRoom === slug) state.startedRoom = null;
  save(purchaseId, state);
}

export function getRoomProgress(state: ProgressState, slug: string, total: number): number {
  const room = state.rooms[slug];
  if (!room) return 0;
  if (room.completedAt) return 100;
  const answered = Object.keys(room.answers).length;
  return Math.round((answered / Math.max(1, total)) * 100);
}

export function isRoomComplete(state: ProgressState, slug: string): boolean {
  return Boolean(state.rooms[slug]?.completedAt);
}

export function allRoomsCompleted(state: ProgressState, slugs: string[]): boolean {
  return slugs.length > 0 && slugs.every((s) => isRoomComplete(state, s));
}