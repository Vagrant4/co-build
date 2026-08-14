import { del, head, put } from "@vercel/blob";
import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";
import { pathToFileURL } from "node:url";
import { assertMonthlyStripePrice } from "../src/lib/stripe-billing";

type Result = { provider: string; status: "passed"; detail: string };
const results: Result[] = [];

export async function verifyProductionProviders() {
  results.length = 0;
  await verifyBlob();
  await verifyScanner();
  await verifyResend();
  await verifySentry();
  await verifyStripe();
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  return [...results];
}

async function verifyBlob() {
  const token = required("BLOB_READ_WRITE_TOKEN");
  const key = `acceptance/${crypto.randomUUID()}.txt`;
  try {
    const uploaded = await put(key, "SpaceOnCall private storage acceptance.", { access: "private", token, addRandomSuffix: false });
    const metadata = await head(uploaded.pathname, { token });
    if (!metadata || metadata.size <= 0) throw new Error("Private Blob metadata was not readable.");
    results.push({ provider: "vercel-blob", status: "passed", detail: "private write, metadata read, and cleanup" });
  } finally {
    await del(key, { token }).catch(() => undefined);
  }
}

async function verifyScanner() {
  const endpoint = new URL(required("MALWARE_SCANNER_URL"));
  if (endpoint.protocol !== "https:") throw new Error("MALWARE_SCANNER_URL must use HTTPS.");
  const token = required("MALWARE_SCANNER_TOKEN");
  const scan = async (body: string) => {
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" }, body, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Scanner acceptance returned HTTP ${response.status}.`);
    return response.json() as Promise<{ safe?: boolean }>;
  };
  if ((await scan("SpaceOnCall harmless acceptance payload.")).safe !== true) throw new Error("Scanner rejected the clean control.");
  const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  if ((await scan(eicar)).safe !== false) throw new Error("Scanner failed the EICAR detection check.");
  results.push({ provider: "malware-scanner", status: "passed", detail: "clean accepted and EICAR rejected" });
}

async function verifyResend() {
  const apiKey = required("RESEND_API_KEY");
  const from = required("TRANSACTIONAL_EMAIL_FROM");
  const to = required("PROVIDER_ACCEPTANCE_EMAIL");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "SpaceOnCall provider acceptance", text: `Automated delivery acceptance ${new Date().toISOString()}` }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Resend acceptance returned HTTP ${response.status}.`);
  const payload = await response.json() as { id?: string };
  if (!payload.id) throw new Error("Resend did not return a delivery identifier.");
  results.push({ provider: "resend", status: "passed", detail: "acceptance email accepted by provider" });
}

async function verifySentry() {
  const dsn = required("NEXT_PUBLIC_SENTRY_DSN");
  const authToken = required("SENTRY_AUTH_TOKEN");
  const org = required("SENTRY_ORG");
  const project = required("SENTRY_PROJECT");
  Sentry.init({ dsn, enabled: true, environment: "provider-acceptance", sendDefaultPii: false });
  const eventId = Sentry.captureMessage("SpaceOnCall automated provider acceptance", "info");
  if (!(await Sentry.flush(10_000))) throw new Error("Sentry did not flush the acceptance event.");
  const response = await fetch(`https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/events/${eventId}/`, { headers: { Authorization: `Bearer ${authToken}` }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Sentry event confirmation returned HTTP ${response.status}.`);
  results.push({ provider: "sentry", status: "passed", detail: "event submitted and confirmed" });
}

async function verifyStripe() {
  const stripe = new Stripe(required("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2 });
  const price = await stripe.prices.retrieve(required("STRIPE_MONTHLY_PRICE_ID"));
  assertMonthlyStripePrice(price);
  const account = await stripe.accounts.retrieve();
  if (!account.charges_enabled || !account.payouts_enabled) throw new Error("Stripe charges or payouts are not enabled.");
  const webhookUrl = new URL("/api/stripe/webhook", required("NEXT_PUBLIC_APP_URL")).toString();
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (!endpoints.data.some((endpoint) => endpoint.status === "enabled" && endpoint.url === webhookUrl)) throw new Error("Enabled production Stripe webhook endpoint was not found.");
  results.push({ provider: "stripe", status: "passed", detail: "account, S$5 monthly price, and webhook verified" });
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required for production provider acceptance.`);
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyProductionProviders().catch((error) => { console.error(error instanceof Error ? error.message : "Provider acceptance failed."); process.exitCode = 1; });
}
