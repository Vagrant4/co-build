import { isAuthorizedCronRequest } from "../../../../src/lib/cron-auth";
import { logEvent, requestIdFrom } from "../../../../src/lib/observability";

export const dynamic = "force-dynamic";

type AlertPayload = {
  source: string;
  event: string;
  occurredAt: string;
  summary: Record<string, string | number | boolean | null | undefined>;
};

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.OPS_ALERT_WEBHOOK_TOKEN)) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }

  const payload = await readAlertPayload(request);
  if (!payload) return Response.json({ error: "Invalid alert payload." }, { status: 400, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  const to = process.env.OPERATIONS_OWNER_EMAIL?.trim();
  if (!apiKey || !from || !to) {
    logEvent("error", "ops_alert_delivery_misconfigured", { requestId, event: payload.event });
    return Response.json({ error: "Alert delivery is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[SpaceOnCall] ${payload.event}`.slice(0, 140),
      text: formatAlert(payload)
    })
  });
  if (!response.ok) {
    logEvent("error", "ops_alert_delivery_failed", { requestId, event: payload.event, status: response.status });
    return Response.json({ error: "Alert delivery failed." }, { status: 502, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }

  logEvent("info", "ops_alert_delivered", { requestId, event: payload.event });
  return Response.json({ delivered: true }, { status: 202, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
}

async function readAlertPayload(request: Request): Promise<AlertPayload | null> {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 16_384) return null;
  try {
    const value = (await request.json()) as Partial<AlertPayload>;
    if (value.source !== "co-build" || !safeText(value.event, 100) || !safeText(value.occurredAt, 60) || !value.summary || typeof value.summary !== "object" || Array.isArray(value.summary)) return null;
    const summaryEntries = Object.entries(value.summary);
    if (summaryEntries.length > 30 || summaryEntries.some(([key, item]) => !safeText(key, 80) || !isScalar(item))) return null;
    return value as AlertPayload;
  } catch {
    return null;
  }
}

function formatAlert(payload: AlertPayload): string {
  const details = Object.entries(payload.summary).map(([key, value]) => `${key}: ${value ?? "null"}`);
  return [`Event: ${payload.event}`, `Occurred: ${payload.occurredAt}`, ...details].join("\n").slice(0, 6000);
}

function safeText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !/[\r\n]/.test(value);
}

function isScalar(value: unknown): value is string | number | boolean | null | undefined {
  return value == null || typeof value === "string" && value.length <= 500 || typeof value === "number" && Number.isFinite(value) || typeof value === "boolean";
}
