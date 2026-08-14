import { prisma } from "./db";
import { uploadsAreEnabled } from "./uploads";
import { verifyAuditCheckpoints } from "./audit-checkpoints";
import { buildOpsWarnings } from "./ops-signals";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export async function collectOperationsSnapshot(now = new Date()) {
  const recentBookingSince = new Date(now.getTime() - 30 * DAY_MS);
  const staleUploadBefore = new Date(now.getTime() - HOUR_MS);
  const recentStripeSince = new Date(now.getTime() - 35 * DAY_MS);
  const [
    activeSubscriptions,
    pastDueSubscriptions,
    stripeSubscriptions,
    recentStripeEvents,
    recentBookings,
    activeBookings,
    uploadSize,
    stalePending,
    missingMetadata,
    unscannedUploads,
    failedNotifications,
    openModerationReports,
    submittedPayments,
    audit
  ] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, platformSubscriptionStatus: "ACTIVE", suspended: false } }),
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, platformSubscriptionStatus: "PAST_DUE" } }),
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, platformSubscriptionProvider: "STRIPE", stripeSubscriptionId: { not: null } } }),
    prisma.stripeWebhookEvent.count({ where: { processedAt: { gte: recentStripeSince } } }),
    prisma.booking.count({ where: { createdAt: { gte: recentBookingSince } } }),
    prisma.booking.count({ where: { status: { in: ["PENDING_HOST", "PENDING_ADMIN_HIGH_RISK", "APPROVED_FOR_PAYMENT", "PAYMENT_SUBMITTED", "PAID_CONFIRMED", "CHECKED_IN"] } } }),
    prisma.upload.aggregate({ _sum: { sizeBytes: true } }),
    prisma.upload.count({ where: { uploadStatus: "PENDING", createdAt: { lt: staleUploadBefore } } }),
    prisma.upload.count({ where: { uploadStatus: "AVAILABLE", OR: [{ objectKey: null }, { contentType: null }, { sizeBytes: null }, { checksumSha256: null }] } }),
    prisma.upload.count({ where: { uploadStatus: "AVAILABLE", scanStatus: { in: ["PENDING", "NOT_REQUIRED"] }, storageProvider: "VERCEL_BLOB" } }),
    prisma.notification.count({ where: { channel: "EMAIL", status: "FAILED", attemptCount: { gte: 5 } } }),
    prisma.moderationReport.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.paymentRecord.count({ where: { status: "SUBMITTED" } }),
    verifyAuditCheckpoints()
  ]);
  const uploadBytes = uploadSize._sum.sizeBytes || 0;
  const uploadsConfigured = uploadsAreEnabled();
  const warningInput = {
    activeSubscriptions,
    recentBookings,
    stalePending,
    missingMetadata,
    uploadBytes,
    uploadsConfigured,
    failedNotifications,
    openModerationReports,
    pastDueSubscriptions,
    unscannedUploads,
    stripeSubscriptions,
    recentStripeEvents,
    auditValid: audit.valid
  };
  return {
    generatedAt: now,
    activeSubscriptions,
    pastDueSubscriptions,
    stripeSubscriptions,
    recentStripeEvents,
    recentBookings,
    activeBookings,
    uploadBytes,
    stalePending,
    missingMetadata,
    unscannedUploads,
    failedNotifications,
    openModerationReports,
    submittedPayments,
    uploadsConfigured,
    auditValid: audit.valid,
    warnings: buildOpsWarnings(warningInput)
  };
}
