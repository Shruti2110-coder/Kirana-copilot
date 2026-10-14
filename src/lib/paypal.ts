/**
 * PayPal REST API (Orders v2) — sandbox by default.
 * Flow: create order -> customer opens approve link -> PayPal redirects to
 * /pay/return -> we capture -> transaction marked paid. The webhook is a
 * backup in case the customer closes the tab before the redirect.
 */

const BASE = () => process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
export const paypalEnabled = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (res.status === 401) {
    throw new Error(
      "PayPal rejected the keys. Copy the full Client ID and Secret from the PayPal Developer dashboard into .env, then restart the app.",
    );
  }
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`PayPal ${path} failed (${res.status}): ${body}`);
  return (body ? JSON.parse(body) : {}) as T;
}

/** PayPal doesn't support domestic INR in India, so the demo charges in USD. */
export function toChargeAmount(inr: number) {
  const currency = process.env.PAYPAL_CURRENCY || "USD";
  if (currency === "INR") return { currency, value: inr.toFixed(2) };
  const rate = Number(process.env.INR_PER_USD || 84);
  return { currency, value: Math.max(0.01, inr / rate).toFixed(2) };
}

type Link = { href: string; rel: string };
type Order = { id: string; status: string; links: Link[] };

export async function createPaymentOrder(opts: {
  transactionId: string;
  amountInr: number;
  description: string;
  shopName: string;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const amount = toChargeAmount(opts.amountInr);
  const order = await api<Order>("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": `order-${opts.transactionId}` }, // idempotent
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.transactionId,
          custom_id: opts.transactionId,
          description: opts.description.slice(0, 127),
          amount: { currency_code: amount.currency, value: amount.value },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: opts.shopName.slice(0, 127),
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: `${appUrl}/pay/return?txn=${opts.transactionId}`,
            cancel_url: `${appUrl}/pay/cancel?txn=${opts.transactionId}`,
          },
        },
      },
    }),
  });
  const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!approve) throw new Error("PayPal did not return an approval link");
  return { orderId: order.id, approveUrl: approve.href, charged: amount };
}

export async function captureOrder(orderId: string) {
  return api<{ id: string; status: string }>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `capture-${orderId}` },
  });
}

export async function getOrder(orderId: string) {
  return api<{ id: string; status: string }>(`/v2/checkout/orders/${orderId}`);
}

/** Verify a webhook really came from PayPal. */
export async function verifyWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const res = await api<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  return res.verification_status === "SUCCESS";
}
