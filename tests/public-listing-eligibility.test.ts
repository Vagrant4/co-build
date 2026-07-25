import { describe, expect, it } from "vitest";
import { isPublicListingEligible } from "../src/lib/authorization-policy";

const approvedHost = { role: "HOST" as const, suspended: false, verificationStatus: "APPROVED" };

describe("public listing eligibility", () => {
  it("requires approved listing and approved active host", () => {
    expect(isPublicListingEligible({ status: "APPROVED", host: approvedHost })).toBe(true);
    for (const status of ["DRAFT", "PENDING_ADMIN", "REJECTED", "SUSPENDED"]) {
      expect(isPublicListingEligible({ status, host: approvedHost })).toBe(false);
    }
    expect(isPublicListingEligible({ status: "APPROVED", host: { ...approvedHost, suspended: true } })).toBe(false);
    expect(isPublicListingEligible({ status: "APPROVED", host: { ...approvedHost, verificationStatus: "PENDING" } })).toBe(false);
    expect(isPublicListingEligible({ status: "APPROVED", host: null })).toBe(false);
  });
});
