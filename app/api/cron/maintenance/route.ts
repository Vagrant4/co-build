import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { isAuthorizedCronRequest } from "@/src/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(provided, expected)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const now = new Date();
  const staleUploadBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [rateLimits, uploads] = await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.upload.updateMany({ where: { uploadStatus: "PENDING", createdAt: { lt: staleUploadBefore } }, data: { uploadStatus: "REJECTED", scanStatus: "FAILED", deletedAt: now } })
  ]);
  logEvent("info", "maintenance_completed", { requestId, expiredRateLimits: rateLimits.count, staleUploadReservations: uploads.count });
  return Response.json({ status: "ok", expiredRateLimits: rateLimits.count, staleUploadReservations: uploads.count }, { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
}
