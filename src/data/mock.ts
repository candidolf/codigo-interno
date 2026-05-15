export type Theme = "joy" | "fear" | "anger" | "discovery";

export interface Room {
  slug: string;
  title: string;
  theme: Theme;
  description: string;
  ageMin: number;
  ageMax: number;
  active: boolean;
}

export interface Question {
  id: string;
  roomSlug: string;
  text: string;
  answers: { id: string; label: string; emoji: string }[];
}

export const rooms: Room[] = [
  { slug: "alegria", title: "Sala da Alegria", theme: "joy", description: "Explorando o que te traz luz e entusiasmo.", ageMin: 6, ageMax: 99, active: true },
  { slug: "medo", title: "Sala do Medo", theme: "fear", description: "Conhecendo o que te paralisa e o que te protege.", ageMin: 8, ageMax: 99, active: true },
  { slug: "raiva", title: "Sala da Raiva", theme: "anger", description: "Entendendo seus limites e gatilhos.", ageMin: 10, ageMax: 99, active: true },
  { slug: "descobertas", title: "Sala das Descobertas", theme: "discovery", description: "O que move sua curiosidade.", ageMin: 6, ageMax: 99, active: true },
];

const mk = (roomSlug: string, n: number, prefix: string): Question[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${roomSlug}-${i + 1}`,
    roomSlug,
    text: `${prefix} #${i + 1}: como você reagiria nessa situação?`,
    answers: [
      { id: "a", label: "Encaro de frente, sem hesitar", emoji: "⚡" },
      { id: "b", label: "Observo antes de agir", emoji: "🔭" },
      { id: "c", label: "Procuro alguém de confiança", emoji: "🤝" },
      { id: "d", label: "Mudo o foco para outra coisa", emoji: "🌀" },
    ],
  }));

export const questions: Question[] = [
  ...mk("alegria", 5, "Um momento de surpresa boa"),
  ...mk("medo", 5, "Uma situação desconhecida"),
  ...mk("raiva", 5, "Algo te tira do sério"),
  ...mk("descobertas", 5, "Uma descoberta inesperada"),
];

export interface TestPurchase {
  id: string;
  buyerName: string;
  testandoName: string;
  testandoAge: number;
  status: "Não iniciado" | "Em andamento" | "Concluído" | "Presenteado";
  createdAt: string;
  sellerCode?: string;
}

export const purchases: TestPurchase[] = [
  { id: "t-001", buyerName: "Você", testandoName: "Você mesmo", testandoAge: 32, status: "Concluído", createdAt: "2026-04-12", sellerCode: "VEND-014" },
  { id: "t-002", buyerName: "Você", testandoName: "Helena (filha)", testandoAge: 11, status: "Em andamento", createdAt: "2026-05-01" },
  { id: "t-003", buyerName: "Você", testandoName: "Convidado: Lucas", testandoAge: 28, status: "Presenteado", createdAt: "2026-05-10", sellerCode: "VEND-007" },
];

export interface Commission {
  sellerCode: string;
  sellerName: string;
  testsSold: number;
  gross: number;
  rate: number;
}

export const commissions: Commission[] = [
  { sellerCode: "VEND-007", sellerName: "Marina Souza", testsSold: 42, gross: 42 * 29.9, rate: 0.2 },
  { sellerCode: "VEND-014", sellerName: "Rafael Lima", testsSold: 28, gross: 28 * 29.9, rate: 0.2 },
  { sellerCode: "VEND-021", sellerName: "Bia Andrade", testsSold: 13, gross: 13 * 29.9, rate: 0.15 },
];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "master" | "user";
  linkedTo?: string;
  age: number;
}

export const adminUsers: AdminUser[] = [
  { id: "u1", name: "Ana Coordenadora", email: "ana@psychgame.ai", role: "admin", age: 41 },
  { id: "u2", name: "Carlos Master", email: "carlos@email.com", role: "master", age: 38 },
  { id: "u3", name: "Helena", email: "—", role: "user", linkedTo: "Carlos Master", age: 11 },
  { id: "u4", name: "Patrícia Silva", email: "patricia@email.com", role: "master", age: 45 },
  { id: "u5", name: "Lucas Convidado", email: "lucas@email.com", role: "user", linkedTo: "Patrícia Silva", age: 28 },
];

export const themeStyle = (t: Theme) => {
  switch (t) {
    case "joy": return { bg: "bg-joy/15", text: "text-joy", border: "border-joy/40", emoji: "☀️" };
    case "fear": return { bg: "bg-fear/15", text: "text-fear", border: "border-fear/40", emoji: "🌙" };
    case "anger": return { bg: "bg-anger/15", text: "text-anger", border: "border-anger/40", emoji: "🔥" };
    case "discovery": return { bg: "bg-discovery/15", text: "text-discovery", border: "border-discovery/40", emoji: "🧭" };
  }
};
