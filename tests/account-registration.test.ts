import { describe, expect, it, vi } from "vitest";
import { DuplicateAccountError, registerAccount, updateOwnProfile } from "../src/lib/account-service";

const input = {
  id: "new-user",
  authProviderId: "clerk:new-user",
  email: "person@example.com",
  role: "RENTER" as const,
  fullName: "New Person",
  companyName: "New Company",
  uen: null,
  workType: "Assembly"
};

describe("account registration security", () => {
  it("cannot overwrite or unsuspend an existing account", async () => {
    const store = {
      findFirst: vi.fn().mockResolvedValue({ id: "existing-suspended-user" }),
      create: vi.fn(),
      update: vi.fn()
    };
    await expect(registerAccount(store as never, input)).rejects.toBeInstanceOf(DuplicateAccountError);
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
  });

  it("normalizes email and creates a pending, unsuspended account once", async () => {
    const store = { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(({ data }) => data), update: vi.fn() };
    const created = await registerAccount(store as never, { ...input, email: " Person@Example.COM " });
    expect(created.email).toBe("person@example.com");
    expect(created.verificationStatus).toBe("PENDING");
    expect(store.update).not.toHaveBeenCalled();
  });

  it("converts a unique-index race into the same safe duplicate error", async () => {
    const store = { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockRejectedValue({ code: "P2002" }), update: vi.fn() };
    await expect(registerAccount(store as never, input)).rejects.toBeInstanceOf(DuplicateAccountError);
  });

  it("profile updates whitelist non-privileged fields", async () => {
    const store = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({ id: "new-user" }) };
    await updateOwnProfile(store as never, "new-user", { fullName: "Changed", companyName: "Company", uen: null, workType: "Packing" });
    const data = store.update.mock.calls[0][0].data;
    expect(data).toEqual({ fullName: "Changed", companyName: "Company", uen: null, workType: "Packing" });
    expect(data).not.toHaveProperty("role");
    expect(data).not.toHaveProperty("suspended");
    expect(data).not.toHaveProperty("verificationStatus");
    expect(data).not.toHaveProperty("platformSubscriptionStatus");
  });
});
