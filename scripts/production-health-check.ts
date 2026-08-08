async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is required.");
  const startedAt = Date.now();
  const response = await fetch(new URL("/api/health", baseUrl), { headers: { "User-Agent": "co-build-health-check/1.0" }, signal: AbortSignal.timeout(10_000) });
  const durationMs = Date.now() - startedAt;
  const payload = await response.json() as { status?: string };
  if (!response.ok || payload.status !== "ok") throw new Error(`Health check failed with HTTP ${response.status}.`);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), status: payload.status, durationMs }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Health check failed."); process.exitCode = 1; });
