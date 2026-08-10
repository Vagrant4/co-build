import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_VERSION } from "../src/lib/legal-documents";
import { pilotReadinessIssues } from "../src/lib/pilot-readiness";

function readyPilotEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    APP_MODE: "pilot",
    DATABASE_URL: "postgresql://user:password@example-pooler.neon.tech/db",
    DIRECT_URL: "postgresql://user:password@example.neon.tech/db",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_value",
    CLERK_SECRET_KEY: "sk_test_value",
    NEXT_PUBLIC_APP_URL: "https://co-build.example",
    COMPANY_PAYMENT_NAME: "Co-Build",
    COMPANY_PAYMENT_UEN: "202600000A",
    COMPANY_PAYMENT_BANK: "Bank",
    COMPANY_PAYMENT_ACCOUNT: "123",
    DPO_CONTACT_EMAIL: "privacy@example.com",
    SUPPORT_CONTACT_EMAIL: "support@example.com",
    OPERATIONS_OWNER_EMAIL: "ops@example.com",
    SECURITY_OWNER_EMAIL: "security@example.com",
    BACKUP_OWNER_EMAIL: "backup@example.com",
    CRON_SECRET: "test-cron-secret",
    ERROR_MONITORING_PROJECT_URL: "https://monitoring.example/co-build",
    NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    SENTRY_ORG: "example-org",
    SENTRY_PROJECT: "spaceoncall",
    SENTRY_AUTH_TOKEN: "sentry-token",
    OPS_ALERT_WEBHOOK_URL: "https://alerts.example/co-build",
    OPS_ALERT_WEBHOOK_TOKEN: "test-alert-secret",
    UPTIME_MONITOR_URL: "https://monitor.example/check",
    INCIDENT_RESPONSE_URL: "https://docs.example/incidents",
    RESTORE_DRILL_COMPLETED_AT: "2026-08-08T00:00:00.000Z",
    DATA_RETENTION_UPLOAD_DAYS: "365",
    DATA_RETENTION_ACCOUNT_DAYS: "2555",
    RETENTION_EXECUTION_ENABLED: "true",
    RESEND_API_KEY: "re_test_value",
    TRANSACTIONAL_EMAIL_FROM: "Co-Build <notifications@example.com>",
    REAL_UPLOADS_ENABLED: "true",
    BLOB_READ_WRITE_TOKEN: "blob-token",
    ALLOW_UNSCANNED_UPLOADS: "true",
    LEGAL_PILOT_OWNER_ACKNOWLEDGED: "true"
  };
}

describe("pilot release gate", () => {
  it("fails closed when operational configuration is absent", () => {
    const issues = pilotReadinessIssues({ NODE_ENV: "test", APP_MODE: "pilot" } as NodeJS.ProcessEnv);
    expect(issues.map((issue) => issue.key)).toEqual(expect.arrayContaining(["DATABASE_URL", "CLERK_SECRET_KEY", "BLOB_READ_WRITE_TOKEN", "LEGAL_PILOT_OWNER_ACKNOWLEDGED", "RESTORE_DRILL_COMPLETED_AT", "RESEND_API_KEY"]));
  });

  it("passes an explicitly configured pilot environment", () => {
    expect(pilotReadinessIssues(readyPilotEnvironment())).toEqual([]);
  });

  it("keeps production blocked until malware scanning is configured", () => {
    const environment = readyPilotEnvironment();
    environment.APP_MODE = "production";
    environment.LEGAL_REVIEW_APPROVED_VERSION = LEGAL_DOCUMENT_VERSION;
    expect(pilotReadinessIssues(environment)).toEqual(expect.arrayContaining([expect.objectContaining({ key: "UPLOAD_MALWARE_SCANNER" })]));
    environment.MALWARE_SCANNER_URL = "https://scanner.example/scan";
    environment.MALWARE_SCANNER_TOKEN = "scanner-token";
    expect(pilotReadinessIssues(environment)).toEqual([]);
  });
});
