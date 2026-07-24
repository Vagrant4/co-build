import { describe, expect, it } from "vitest";
import { showcaseHosts, showcaseListingHostIds, showcaseRenters } from "../prisma/seed-demo";
import { seedListings } from "../src/lib/seed-data";

describe("showcase seed data", () => {
  it("provides 10 dummy host accounts and 10 dummy renter accounts", () => {
    expect(showcaseHosts).toHaveLength(10);
    expect(showcaseRenters).toHaveLength(10);
    expect(new Set(showcaseHosts.map((host) => host.email)).size).toBe(10);
    expect(new Set(showcaseRenters.map((renter) => renter.email)).size).toBe(10);
  });

  it("gives every showcase listing a host while preserving light-booking size bands", () => {
    expect(seedListings).toHaveLength(10);
    expect(seedListings.every((listing) => Boolean(showcaseListingHostIds[listing.slug]))).toBe(true);
    expect(new Set(Object.values(showcaseListingHostIds)).size).toBe(10);
    expect(seedListings.every((listing) => listing.sizeSqft < 10000)).toBe(true);
  });
});
