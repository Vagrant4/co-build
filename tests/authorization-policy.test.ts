import { describe, expect, it } from "vitest";
import { canAccessBooking, canAccessConversation, canManageBookingStatus } from "../src/lib/authorization-policy";

describe("authorization policy", () => {
  const renterA = { id: "renter-a", role: "RENTER" as const };
  const renterB = { id: "renter-b", role: "RENTER" as const };
  const hostA = { id: "host-a", role: "HOST" as const };
  const hostB = { id: "host-b", role: "HOST" as const };

  it("prevents Renter A reading or sending in Renter B's conversation", () => {
    expect(canAccessConversation(renterA, { renterId: renterB.id, hostId: hostA.id })).toBe(false);
    expect(canAccessConversation(renterB, { renterId: renterB.id, hostId: hostA.id })).toBe(true);
  });

  it("allows a host only for conversations and bookings on their own listing", () => {
    expect(canAccessConversation(hostA, { renterId: renterA.id, hostId: hostA.id })).toBe(true);
    expect(canAccessConversation(hostB, { renterId: renterA.id, hostId: hostA.id })).toBe(false);
    expect(canAccessBooking(hostB, { userId: renterA.id, hostId: hostA.id })).toBe(false);
  });

  it("restricts host and admin booking transitions by authenticated role", () => {
    expect(canManageBookingStatus(hostA, hostA.id, "HOST_APPROVE")).toBe(true);
    expect(canManageBookingStatus(hostB, hostA.id, "HOST_APPROVE")).toBe(false);
    expect(canManageBookingStatus(renterA, hostA.id, "ADMIN_APPROVE")).toBe(false);
    expect(canManageBookingStatus({ id: "admin", role: "ADMIN" }, hostA.id, "ADMIN_APPROVE")).toBe(true);
  });
});
