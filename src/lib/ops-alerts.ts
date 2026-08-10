export async function sendOpsAlert(event: string, summary: Record<string, string | number | boolean | null | undefined>, environment: NodeJS.ProcessEnv = process.env): Promise<{ delivered: boolean; skipped: boolean }> {
  const endpoint = environment.OPS_ALERT_WEBHOOK_URL?.trim();
  const token = environment.OPS_ALERT_WEBHOOK_TOKEN?.trim();
  if (!endpoint || !token) return { delivered: false, skipped: true };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "co-build", event, occurredAt: new Date().toISOString(), summary }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Operations alert failed with HTTP ${response.status}.`);
  return { delivered: true, skipped: false };
}
