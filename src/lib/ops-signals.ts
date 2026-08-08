export function buildOpsWarnings(input: {
  activeSubscriptions: number;
  recentBookings: number;
  stalePending: number;
  missingMetadata: number;
  uploadBytes: number;
  uploadsConfigured: boolean;
  failedNotifications?: number;
  openModerationReports?: number;
  auditValid?: boolean;
}): string[] {
  const warnings: string[] = [];
  if (input.activeSubscriptions >= 100) warnings.push("Paid subscribers are at or above 100; review database tier, pooling, backups, and monitoring now.");
  else if (input.activeSubscriptions >= 50) warnings.push("Paid subscribers are at or above 50; plan the next managed database and observability capacity review.");
  if (input.recentBookings >= 100) warnings.push("Booking volume in the last 30 days is high for the light-booking operating model.");
  if (input.uploadBytes >= 5 * 1024 * 1024 * 1024) warnings.push("Recorded private upload volume exceeds 5 GiB; review retention and storage cost.");
  if (input.stalePending) warnings.push(`${input.stalePending} upload reservations are stale and need cleanup.`);
  if (input.missingMetadata) warnings.push(`${input.missingMetadata} available uploads are missing integrity metadata.`);
  if (!input.uploadsConfigured) warnings.push("Real uploads are disabled or private Blob storage is not configured.");
  if (input.failedNotifications) warnings.push(`${input.failedNotifications} email notifications exhausted or are awaiting retry.`);
  if (input.openModerationReports) warnings.push(`${input.openModerationReports} moderation reports require review.`);
  if (input.auditValid === false) warnings.push("Audit checkpoint verification failed; stop sensitive operations and investigate.");
  return warnings;
}
