export function buildOpsWarnings(input: {
  activeSubscriptions: number;
  recentBookings: number;
  stalePending: number;
  missingMetadata: number;
  uploadBytes: number;
  uploadsConfigured: boolean;
  failedNotifications?: number;
  openModerationReports?: number;
  pastDueSubscriptions?: number;
  unscannedUploads?: number;
  stripeSubscriptions?: number;
  recentStripeEvents?: number;
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
  if (input.pastDueSubscriptions) warnings.push(`${input.pastDueSubscriptions} recurring subscriptions are past due and require billing follow-up.`);
  if (input.unscannedUploads) warnings.push(`${input.unscannedUploads} available uploads have not passed malware scanning.`);
  if (input.stripeSubscriptions && !input.recentStripeEvents) warnings.push("Stripe subscriptions exist but no webhook event was recorded in the last 35 days; verify the webhook destination and delivery log.");
  if (input.auditValid === false) warnings.push("Audit checkpoint verification failed; stop sensitive operations and investigate.");
  return warnings;
}
