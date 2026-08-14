import { describe, expect, it } from "vitest";
import { buildOpsWarnings } from "../src/lib/ops-signals";

describe("operations thresholds", () => {
  it("warns at the 50 and 100 paid subscriber review points", () => {
    const base = { recentBookings: 0, stalePending: 0, missingMetadata: 0, uploadBytes: 0, uploadsConfigured: true };
    expect(buildOpsWarnings({ ...base, activeSubscriptions: 50 }).join(" ")).toContain("at or above 50");
    expect(buildOpsWarnings({ ...base, activeSubscriptions: 100 }).join(" ")).toContain("at or above 100");
  });

  it("reports disabled uploads and integrity warning counts without PII", () => {
    const warnings = buildOpsWarnings({ activeSubscriptions: 0, recentBookings: 0, stalePending: 2, missingMetadata: 1, uploadBytes: 0, uploadsConfigured: false });
    expect(warnings.join(" ")).toContain("2 upload reservations");
    expect(warnings.join(" ")).toContain("private Blob storage");
  });

  it("alerts on billing, scanning, and silent Stripe webhook failures", () => {
    const warnings = buildOpsWarnings({
      activeSubscriptions: 2,
      recentBookings: 3,
      stalePending: 0,
      missingMetadata: 0,
      uploadBytes: 100,
      uploadsConfigured: true,
      pastDueSubscriptions: 1,
      unscannedUploads: 2,
      stripeSubscriptions: 2,
      recentStripeEvents: 0
    });
    expect(warnings.join(" ")).toContain("past due");
    expect(warnings.join(" ")).toContain("malware scanning");
    expect(warnings.join(" ")).toContain("webhook event");
  });
});
