import { describe, expect, it } from "vitest";
import {
  ACTIVE_BOOKING_STATUSES,
  bookingWindowsOverlap,
  parseSingaporeBookingWindow
} from "../src/lib/booking-window";
import { bookingDocumentDigest, hasCurrentAgreementAcceptance } from "../src/lib/agreement-acceptance";
import { canCreateBooking, canHostOperate } from "../src/lib/booking-eligibility";
import { nextPaymentState } from "../src/lib/payment-workflow";

describe("booking schedule", () => {
  it("creates a Singapore-local booking window for the selected duration", () => {
    const window = parseSingaporeBookingWindow("2026-08-20", 7, new Date("2026-08-08T00:00:00.000Z"));

    expect(window.timeZone).toBe("Asia/Singapore");
    expect(window.startAt.toISOString()).toBe("2026-08-19T16:00:00.000Z");
    expect(window.endAt.toISOString()).toBe("2026-08-26T16:00:00.000Z");
  });

  it("rejects past, malformed, and excessive booking dates", () => {
    expect(() => parseSingaporeBookingWindow("2026-08-07", 1, new Date("2026-08-08T00:00:00.000Z"))).toThrow(/past/i);
    expect(() => parseSingaporeBookingWindow("20-08-2026", 1, new Date("2026-08-08T00:00:00.000Z"))).toThrow(/date/i);
    expect(() => parseSingaporeBookingWindow("2028-08-20", 1, new Date("2026-08-08T00:00:00.000Z"))).toThrow(/advance/i);
  });

  it("uses half-open intervals so adjacent bookings do not overlap", () => {
    expect(bookingWindowsOverlap(
      { startAt: new Date("2026-08-20T00:00:00Z"), endAt: new Date("2026-08-21T00:00:00Z") },
      { startAt: new Date("2026-08-21T00:00:00Z"), endAt: new Date("2026-08-22T00:00:00Z") }
    )).toBe(false);
    expect(bookingWindowsOverlap(
      { startAt: new Date("2026-08-20T00:00:00Z"), endAt: new Date("2026-08-22T00:00:00Z") },
      { startAt: new Date("2026-08-21T00:00:00Z"), endAt: new Date("2026-08-23T00:00:00Z") }
    )).toBe(true);
    expect(ACTIVE_BOOKING_STATUSES).toContain("PAYMENT_SUBMITTED");
    expect(ACTIVE_BOOKING_STATUSES).not.toContain("CANCELLED");
  });
});

describe("booking eligibility", () => {
  it("requires an approved, active, unsuspended renter", () => {
    expect(canCreateBooking({ role: "RENTER", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" })).toBe(true);
    expect(canCreateBooking({ role: "RENTER", suspended: false, verificationStatus: "PENDING", platformSubscriptionStatus: "ACTIVE" })).toBe(false);
    expect(canCreateBooking({ role: "RENTER", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "UNPAID" })).toBe(false);
    expect(canCreateBooking({ role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" })).toBe(false);
  });

  it("requires an approved, active, unsuspended host for listing and booking operations", () => {
    expect(canHostOperate({ role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" })).toBe(true);
    expect(canHostOperate({ role: "HOST", suspended: false, verificationStatus: "PENDING", platformSubscriptionStatus: "ACTIVE" })).toBe(false);
    expect(canHostOperate({ role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "UNPAID" })).toBe(false);
  });
});

describe("payment reconciliation", () => {
  it("requires admin verification before a booking becomes paid", () => {
    expect(nextPaymentState("APPROVED_FOR_PAYMENT", "SUBMIT_PROOF")).toBe("PAYMENT_SUBMITTED");
    expect(nextPaymentState("PAYMENT_SUBMITTED", "ADMIN_VERIFY")).toBe("PAID_CONFIRMED");
    expect(nextPaymentState("PAYMENT_SUBMITTED", "ADMIN_REJECT")).toBe("APPROVED_FOR_PAYMENT");
    expect(() => nextPaymentState("APPROVED_FOR_PAYMENT", "ADMIN_VERIFY")).toThrow(/transition/i);
  });
});

describe("agreement acknowledgement", () => {
  it("binds both participants to the same current document digest", () => {
    const hash = bookingDocumentDigest("agreement body");
    expect(hash).toHaveLength(64);
    expect(hasCurrentAgreementAcceptance([
      { userId: "renter", documentHash: hash },
      { userId: "host", documentHash: hash }
    ], ["renter", "host"], hash)).toBe(true);
    expect(hasCurrentAgreementAcceptance([
      { userId: "renter", documentHash: hash }
    ], ["renter", "host"], hash)).toBe(false);
  });
});
