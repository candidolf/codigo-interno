// PagBank Orders API client. Server-only.

const SANDBOX_BASE_URL = "https://sandbox.api.pagseguro.com";
const PROD_BASE_URL = "https://api.pagseguro.com";

export type PagBankConfig = {
  token: string;
  baseUrl: string;
  env: "sandbox" | "production";
};

export type PagBankLink = {
  rel: string;
  href: string;
  media?: string;
  type?: string;
};

export type PagBankCharge = {
  id: string;
  reference_id?: string;
  status: string;
  payment_method?: {
    type?: string;
    pix?: { expiration_date?: string };
  };
  qr_code?: { id?: string; text?: string };
  links?: PagBankLink[];
};

export type PagBankOrder = {
  id: string;
  reference_id?: string;
  charges?: PagBankCharge[];
  links?: PagBankLink[];
  notification_urls?: string[];
};

export function paymentsEnabled(): boolean {
  return (process.env.PAGBANK_PAYMENTS_ENABLED ?? "false").toLowerCase() === "true";
}

export function getPagBankConfig(): PagBankConfig {
  const requestedEnv = (process.env.PAGBANK_ENV ?? "sandbox").toLowerCase();
  const production = requestedEnv === "production" || requestedEnv === "prod";
  const token = production
    ? process.env.PAGBANK_TOKEN_PROD || process.env.PAGBANK_TOKEN
    : process.env.PAGBANK_TOKEN_SANDBOX || process.env.PAGBANK_TOKEN;

  if (!token) {
    throw new Error(
      production ? "PAGBANK_TOKEN_PROD não configurado" : "PAGBANK_TOKEN_SANDBOX não configurado",
    );
  }

  return {
    token,
    baseUrl: production ? PROD_BASE_URL : SANDBOX_BASE_URL,
    env: production ? "production" : "sandbox",
  };
}

async function pagBankFetch<T>(
  config: PagBankConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error("[pagbank]", response.status, path, payload);
    const errors = (payload as { error_messages?: Array<{ description?: string }> } | null)
      ?.error_messages;
    const description = errors
      ?.map((error) => error.description)
      .filter(Boolean)
      .join("; ");
    throw new Error(`PagBank ${response.status}${description ? `: ${description}` : ""}`);
  }

  return payload as T;
}

function splitPhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return undefined;
  return {
    country: "55",
    area: digits.slice(0, 2),
    number: digits.slice(2),
    type: "MOBILE",
  };
}

export async function createPixOrder(
  config: PagBankConfig,
  input: {
    purchaseId: string;
    amountCents: number;
    customer: { name: string; email: string; taxId: string; phone?: string | null };
    notificationUrl: string;
  },
): Promise<PagBankOrder> {
  const phone = splitPhone(input.customer.phone);
  const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return pagBankFetch<PagBankOrder>(config, "/orders", {
    method: "POST",
    headers: { "x-idempotency-key": input.purchaseId.replace(/-/g, "") },
    body: JSON.stringify({
      reference_id: input.purchaseId,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        tax_id: input.customer.taxId,
        ...(phone ? { phones: [phone] } : {}),
      },
      items: [
        {
          reference_id: input.purchaseId,
          name: "Teste Código Interno",
          quantity: 1,
          unit_amount: input.amountCents,
        },
      ],
      charges: [
        {
          reference_id: input.purchaseId,
          description: "Teste Código Interno",
          amount: { value: input.amountCents, currency: "BRL" },
          payment_method: {
            type: "PIX",
            pix: { expiration_date: expirationDate },
          },
        },
      ],
      notification_urls: [input.notificationUrl],
    }),
  });
}

export async function getOrder(config: PagBankConfig, orderId: string): Promise<PagBankOrder> {
  return pagBankFetch<PagBankOrder>(config, `/orders/${encodeURIComponent(orderId)}`);
}

export function paymentData(order: PagBankOrder) {
  const charge = order.charges?.[0];
  const qrCodeUrl = charge?.links?.find((link) => link.rel === "QRCODE.PNG")?.href ?? null;
  return {
    charge,
    qrCodeUrl,
    copyPaste: charge?.qr_code?.text ?? null,
    expirationDate: charge?.payment_method?.pix?.expiration_date ?? null,
  };
}
