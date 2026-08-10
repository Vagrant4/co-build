import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/ops/alerts/route";
import { sendOpsAlert } from "../src/lib/ops-alerts";

const originalFetch = global.fetch;
const originalEnvironment = { ...process.env };

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnvironment };
  vi.restoreAllMocks();
});

describe("operations alert webhook", () => {
  it("rejects unsigned requests", async () => {
    process.env.OPS_ALERT_WEBHOOK_TOKEN = "test-alert-secret";
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("sends a bounded alert email to the configured owner", async () => {
    process.env.OPS_ALERT_WEBHOOK_TOKEN = "test-alert-secret";
    process.env.RESEND_API_KEY = "re_test";
    process.env.TRANSACTIONAL_EMAIL_FROM = "SpaceOnCall <alerts@example.com>";
    process.env.OPERATIONS_OWNER_EMAIL = "owner@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const response = await POST(request("Bearer test-alert-secret"));
    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.subject).toContain("maintenance_attention_required");
  });

  it("adds the shared secret when sending an alert", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    global.fetch = fetchMock;
    await sendOpsAlert("maintenance_attention_required", { auditValid: false }, {
      OPS_ALERT_WEBHOOK_URL: "https://spaceoncall.com/api/ops/alerts",
      OPS_ALERT_WEBHOOK_TOKEN: "test-alert-secret"
    } as NodeJS.ProcessEnv);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-alert-secret");
  });
});

function request(authorization?: string) {
  return new Request("https://spaceoncall.com/api/ops/alerts", {
    method: "POST",
    headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
    body: JSON.stringify({ source: "co-build", event: "maintenance_attention_required", occurredAt: new Date().toISOString(), summary: { auditValid: false } })
  });
}
