// Asaas API client. Server-only.
// Docs: https://docs.asaas.com/docs/authentication-2
const USER_AGENT = "codigo-interno-app";
const SANDBOX_BASE_URL = "https://api-sandbox.asaas.com/v3";
const PROD_BASE_URL = "https://api.asaas.com/v3";

/**
 * Escolhe credenciais e URL conforme o host da requisição.
 * - Domínio publicado (codigo-interno.lovable.app / custom domain) → produção.
 * - Qualquer preview ou dev → sandbox.
 * Fallback: usa ASAAS_API_KEY antiga se o secret específico não estiver setado.
 */
export function getAsaasConfig(host?: string | null): { apiKey: string; baseUrl: string; env: "sandbox" | "prod" } {
  const h = (host ?? "").toLowerCase();
  const isPreview = h.includes("preview") || h.includes("-dev.") || h.includes("localhost") || h.includes("127.0.0.1") || h === "";
  const useProd = !isPreview;
  if (useProd) {
    const k = process.env.ASAAS_API_KEY_PROD || process.env.ASAAS_API_KEY;
    if (!k) throw new Error("ASAAS_API_KEY_PROD não configurada");
    return { apiKey: k, baseUrl: PROD_BASE_URL, env: "prod" };
  }
  const k = process.env.ASAAS_API_KEY_SANDBOX || process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY_SANDBOX não configurada");
  return { apiKey: k, baseUrl: SANDBOX_BASE_URL, env: "sandbox" };
}

async function asaasFetch<T>(cfg: { apiKey: string; baseUrl: string }, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      access_token: cfg.apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!res.ok) {
    const first = json?.errors?.[0];
    const code = first?.code ? `[${first.code}] ` : "";
    const desc = first?.description ?? json?.message ?? text ?? `HTTP ${res.status}`;
    console.error("[asaas]", res.status, path, json ?? text);
    throw new Error(`Asaas ${res.status}: ${code}${desc}`);
  }
  return json as T;
}

export type AsaasCustomer = { id: string; name: string; cpfCnpj: string };
export type AsaasPayment = {
  id: string;
  status: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  value: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
};
export type AsaasPixQrCode = {
  encodedImage: string; // base64 PNG
  payload: string; // copia-e-cola
  expirationDate?: string;
};

export async function createCustomer(cfg: { apiKey: string; baseUrl: string }, input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(cfg, "/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createPayment(cfg: { apiKey: string; baseUrl: string }, input: {
  customer: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  callback?: {
    successUrl: string;
    autoRedirect?: boolean;
  };
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(cfg, "/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPayment(cfg: { apiKey: string; baseUrl: string }, id: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(cfg, `/payments/${id}`);
}

export async function getPixQrCode(cfg: { apiKey: string; baseUrl: string }, id: string): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(cfg, `/payments/${id}/pixQrCode`);
}

/** YYYY-MM-DD em São Paulo, somando dias úteis aproximadamente (apenas +N dias corridos). */
export function dueDateFromNow(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}