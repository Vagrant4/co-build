import { describe, expect, it } from "vitest";
import { canAccessUpload, canDeleteUpload, canReserveForBooking, canReserveForListing, isUploadDownloadable } from "../src/lib/upload-authorization";

const booking = { userId: "renter-a", status: "PAID_CONFIRMED" as const, listing: { hostId: "host-a" } };

describe("private upload authorization", () => {
  it("allows only the booking renter to reserve check-in evidence", () => {
    expect(canReserveForBooking({ id: "renter-a", role: "RENTER" }, "CHECK_IN", booking)).toBe(true);
    expect(canReserveForBooking({ id: "renter-b", role: "RENTER" }, "CHECK_IN", booking)).toBe(false);
    expect(canReserveForBooking({ id: "host-a", role: "HOST" }, "CHECK_IN", booking)).toBe(false);
  });

  it("allows a host to reserve listing media only for their own listing", () => {
    expect(canReserveForListing({ id: "host-a", role: "HOST" }, "LISTING_PHOTO", { hostId: "host-a" })).toBe(true);
    expect(canReserveForListing({ id: "host-b", role: "HOST" }, "LISTING_PHOTO", { hostId: "host-a" })).toBe(false);
  });

  it("blocks unrelated renters and hosts from private reads and deletes", () => {
    const upload = { type: "CHECK_IN" as const, ownerUserId: "renter-a", uploadedByUserId: "renter-a", listing: null, booking };
    expect(canAccessUpload({ id: "host-a", role: "HOST" }, upload)).toBe(true);
    expect(canAccessUpload({ id: "host-b", role: "HOST" }, upload)).toBe(false);
    expect(canAccessUpload({ id: "renter-b", role: "RENTER" }, upload)).toBe(false);
    expect(canDeleteUpload({ id: "host-a", role: "HOST" }, upload)).toBe(false);
    expect(canDeleteUpload({ id: "admin", role: "ADMIN" }, upload)).toBe(true);
  });

  it("never exposes renter verification documents to a host", () => {
    const verification = { type: "VERIFICATION" as const, ownerUserId: "renter-a", uploadedByUserId: "renter-a", listing: null, booking };
    expect(canAccessUpload({ id: "host-a", role: "HOST" }, verification)).toBe(false);
  });

  it("refuses deleted, unsafe, pending-scan, and legacy-local records", () => {
    const base = { storageProvider: "VERCEL_BLOB", objectKey: "pilot/check_in/a/file.png", uploadStatus: "AVAILABLE", scanStatus: "SAFE" };
    expect(isUploadDownloadable(base)).toBe(true);
    expect(isUploadDownloadable({ ...base, uploadStatus: "DELETED" })).toBe(false);
    expect(isUploadDownloadable({ ...base, scanStatus: "UNSAFE" })).toBe(false);
    expect(isUploadDownloadable({ ...base, scanStatus: "PENDING" })).toBe(false);
    expect(isUploadDownloadable({ ...base, storageProvider: "LEGACY_LOCAL" })).toBe(false);
  });
});
