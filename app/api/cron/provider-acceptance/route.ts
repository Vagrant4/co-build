import { isAuthorizedCronRequest } from "@/src/lib/cron-auth";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { verifyProductionProviders } from "@/scripts/verify-production-providers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }
  try {
    const results = await verifyProductionProviders();
    logEvent("info", "provider_acceptance_passed", { requestId, providerCount: results.length });
    return Response.json({ status: "ok", providers: results.map(({ provider, status }) => ({ provider, status })) }, { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (error) {
    logEvent("error", "provider_acceptance_failed", { requestId, errorName: error instanceof Error ? error.name : "Unknown" });
    return Response.json({ status: "degraded", error: "Provider acceptance failed. Review protected runtime logs." }, { status: 503, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }
}
