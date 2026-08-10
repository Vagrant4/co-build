import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { isAuthorizedCronRequest } from "@/src/lib/cron-auth";
import { deliverPendingEmailNotifications } from "@/src/lib/notifications";
import { createAuditCheckpoint, verifyAuditCheckpoints } from "@/src/lib/audit-checkpoints";
import { executeApprovedRetention } from "@/src/lib/retention";
import { sendOpsAlert } from "@/src/lib/ops-alerts";
import { runPrivateBlobSmoke } from "@/src/lib/blob-smoke";

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
  const [notifications, checkpoint, retention, blobSmoke] = await Promise.all([
    deliverPendingEmailNotifications(),
    createAuditCheckpoint(now),
    process.env.RETENTION_EXECUTION_ENABLED === "true" ? executeApprovedRetention() : Promise.resolve({ examined: 0, deletedObjects: 0, markedDeleted: 0 }),
    runPrivateBlobSmoke()
  ]);
  const auditVerification = await verifyAuditCheckpoints();
  if (!auditVerification.valid) logEvent("error", "audit_checkpoint_verification_failed", { requestId, failedCheckpointId: auditVerification.failedCheckpointId });
  const healthy = auditVerification.valid && blobSmoke.ok;
  const alertNeeded = !healthy || notifications.failed > 0;
  const alert = alertNeeded ? await sendOpsAlert("maintenance_attention_required", { auditValid: auditVerification.valid, blobStorageValid: blobSmoke.ok, failedNotifications: notifications.failed, staleUploadReservations: uploads.count }) : { delivered: false, skipped: true };
  logEvent(healthy ? "info" : "error", "maintenance_completed", { requestId, expiredRateLimits: rateLimits.count, staleUploadReservations: uploads.count, deliveredNotifications: notifications.delivered, failedNotifications: notifications.failed, auditCheckpointCreated: checkpoint.created, auditValid: auditVerification.valid, blobStorageValid: blobSmoke.ok, blobStorageDurationMs: blobSmoke.durationMs });
  return Response.json({ status: healthy ? "ok" : "degraded", expiredRateLimits: rateLimits.count, staleUploadReservations: uploads.count, notifications, retention, blobSmoke, alert, checkpoint: { created: checkpoint.created, eventCount: checkpoint.eventCount }, auditVerification }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
}
