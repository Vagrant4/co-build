import { getAppMode } from "./app-mode";
import { LEGAL_DOCUMENT_VERSION } from "./legal-documents";

export type ReadinessIssue = { key: string; message: string };

const REQUIRED_SHARED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
  "COMPANY_PAYMENT_NAME",
  "COMPANY_PAYMENT_UEN",
  "COMPANY_PAYMENT_BANK",
  "COMPANY_PAYMENT_ACCOUNT",
  "DPO_CONTACT_EMAIL",
  "SUPPORT_CONTACT_EMAIL",
  "OPERATIONS_OWNER_EMAIL",
  "SECURITY_OWNER_EMAIL",
  "BACKUP_OWNER_EMAIL",
  "CRON_SECRET",
  "ERROR_MONITORING_PROJECT_URL",
  "OPS_ALERT_WEBHOOK_URL",
  "UPTIME_MONITOR_URL",
  "INCIDENT_RESPONSE_URL",
  "RESTORE_DRILL_COMPLETED_AT",
  "DATA_RETENTION_UPLOAD_DAYS",
  "DATA_RETENTION_ACCOUNT_DAYS",
  "RETENTION_EXECUTION_ENABLED",
  "RESEND_API_KEY",
  "TRANSACTIONAL_EMAIL_FROM"
] as const;

export function pilotReadinessIssues(environment: NodeJS.ProcessEnv = process.env): ReadinessIssue[] {
  const mode = getAppMode(environment);
  if (mode === "demo") return [];
  const issues: ReadinessIssue[] = [];
  for (const key of REQUIRED_SHARED) {
    if (!environment[key]?.trim()) issues.push({ key, message: `${key} must be configured for ${mode} mode.` });
  }
  if (environment.REAL_UPLOADS_ENABLED !== "true") issues.push({ key: "REAL_UPLOADS_ENABLED", message: "Private durable uploads must be explicitly enabled." });
  if (!environment.BLOB_READ_WRITE_TOKEN?.trim()) issues.push({ key: "BLOB_READ_WRITE_TOKEN", message: "A connected private Blob store is required." });
  const scannerConfigured = Boolean(environment.MALWARE_SCANNER_URL?.trim() && environment.MALWARE_SCANNER_TOKEN?.trim());
  if (mode === "pilot" && environment.ALLOW_UNSCANNED_UPLOADS !== "true" && !scannerConfigured) {
    issues.push({ key: "ALLOW_UNSCANNED_UPLOADS", message: "The pilot owner must explicitly accept the temporary unscanned-upload risk or add a scanner before enabling uploads." });
  }
  if (mode === "production" && !scannerConfigured) issues.push({ key: "UPLOAD_MALWARE_SCANNER", message: "Production requires MALWARE_SCANNER_URL and MALWARE_SCANNER_TOKEN." });
  if (environment.LEGAL_REVIEW_APPROVED_VERSION !== LEGAL_DOCUMENT_VERSION) {
    issues.push({ key: "LEGAL_REVIEW_APPROVED_VERSION", message: `A Singapore lawyer must approve legal document version ${LEGAL_DOCUMENT_VERSION}.` });
  }
  validateUrl(environment, "NEXT_PUBLIC_APP_URL", issues, true);
  validateUrl(environment, "UPTIME_MONITOR_URL", issues, true);
  validateUrl(environment, "INCIDENT_RESPONSE_URL", issues, true);
  validateUrl(environment, "ERROR_MONITORING_PROJECT_URL", issues, true);
  validateUrl(environment, "OPS_ALERT_WEBHOOK_URL", issues, true);
  validatePositiveInteger(environment, "DATA_RETENTION_UPLOAD_DAYS", issues);
  validatePositiveInteger(environment, "DATA_RETENTION_ACCOUNT_DAYS", issues);
  if (environment.RETENTION_EXECUTION_ENABLED !== "true") issues.push({ key: "RETENTION_EXECUTION_ENABLED", message: "Approved retention execution must be enabled for pilot and production." });
  const databaseUrl = environment.DATABASE_URL || "";
  if (databaseUrl && !databaseUrl.includes("-pooler") && !(environment.CI === "true" && environment.PREFLIGHT_ALLOW_NON_POOLER_DATABASE === "true")) {
    issues.push({ key: "DATABASE_URL", message: "DATABASE_URL must use the Neon pooled endpoint." });
  }
  const directUrl = environment.DIRECT_URL || "";
  if (directUrl && directUrl.includes("-pooler")) issues.push({ key: "DIRECT_URL", message: "DIRECT_URL must use the direct Neon endpoint for controlled migrations." });
  if (environment.RESTORE_DRILL_COMPLETED_AT && Number.isNaN(Date.parse(environment.RESTORE_DRILL_COMPLETED_AT))) {
    issues.push({ key: "RESTORE_DRILL_COMPLETED_AT", message: "RESTORE_DRILL_COMPLETED_AT must be an ISO date from a completed restore drill." });
  }
  return issues;
}

export function assertPilotReadiness(environment: NodeJS.ProcessEnv = process.env): void {
  const issues = pilotReadinessIssues(environment);
  if (issues.length) throw new Error(`Pilot readiness failed:\n${issues.map((issue) => `- ${issue.message}`).join("\n")}`);
}

function validatePositiveInteger(environment: NodeJS.ProcessEnv, key: string, issues: ReadinessIssue[]) {
  if (!environment[key]) return;
  const value = Number(environment[key]);
  if (!Number.isSafeInteger(value) || value <= 0) issues.push({ key, message: `${key} must be a positive whole number.` });
}

function validateUrl(environment: NodeJS.ProcessEnv, key: string, issues: ReadinessIssue[], httpsOnly: boolean) {
  if (!environment[key]) return;
  try {
    const value = new URL(environment[key]!);
    if (httpsOnly && value.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    issues.push({ key, message: `${key} must be a valid HTTPS URL.` });
  }
}
