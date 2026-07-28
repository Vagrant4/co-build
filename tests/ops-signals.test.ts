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
});
