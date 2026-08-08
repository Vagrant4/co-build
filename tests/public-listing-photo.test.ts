import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public listing photo boundary", () => {
  it("serves only approved listing photos from eligible hosts", () => {
    const route = readFileSync(join(process.cwd(), "app/api/listings/[listingId]/photos/[uploadId]/route.ts"), "utf8");
    expect(route).toContain('type: "LISTING_PHOTO"');
    expect(route).toContain('uploadStatus: "AVAILABLE"');
    expect(route).toContain('status: "APPROVED"');
    expect(route).toContain('verificationStatus: "APPROVED"');
    expect(route).not.toContain("VERIFICATION");
    expect(route).not.toContain("PAYMENT_EVIDENCE");
  });
});
