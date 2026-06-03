// Asaas Sandbox API client. Server-only.
// Docs: https://docs.asaas.com/docs/authentication-2
const BASE_URL = "https://api-sandbox.asaas.com/v3";
const USER_AGENT = "codigo-interno-app";

function apiKey(): string {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY não configurada");
  return k;
}

async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      access_token: apiKey(),
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

export async function createCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createPayment(input: {
  customer: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
  remoteIp?: string;
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${id}`);
}

export async function getPixQrCode(id: string): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${id}/pixQrCode`);
}

/** YYYY-MM-DD em São Paulo, somando dias úteis aproximadamente (apenas +N dias corridos). */
export function dueDateFromNow(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}