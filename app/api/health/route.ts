import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (error) {
    logEvent("error", "health_database_failed", { requestId, errorName: error instanceof Error ? error.name : "Unknown" });
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  }
}
