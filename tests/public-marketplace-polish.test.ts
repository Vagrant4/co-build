import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dummyListingImages, dummyListingSlugs, isDummyListingSlug, seedListings } from "../src/lib/seed-data";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("public marketplace polish", () => {
  it("uses the authenticated account role for navigation", () => {
    const header = read("components/site-header.tsx");
    const layout = read("app/layout.tsx");

    expect(header).toContain("accountRole");
    expect(header).toContain('role === "HOST"');
    expect(header).toContain('role === "RENTER"');
    expect(header).toContain('role === "ADMIN"');
    expect(layout).toContain("accountRole={account?.role ?? null}");
  });

  it("removes the public phone number and host sample-template section", () => {
    expect(read("app/contact/page.tsx")).not.toMatch(/\+65|Phone/);
    const homepage = read("app/page.tsx");
    expect(homepage).not.toContain("Sample host listings");
    expect(homepage).not.toContain("Sample template");
    expect(homepage).not.toContain('id="host-templates"');
  });

  it("gives every seeded dummy listing a distinct primary image", () => {
    const dummyListings = seedListings.filter((listing) => isDummyListingSlug(listing.slug));
    const primaryImages = dummyListings.map((listing) => listing.photoUrls[0]);

    expect(dummyListings).toHaveLength(dummyListingSlugs.length);
    expect(new Set(primaryImages).size).toBe(primaryImages.length);
    expect(new Set(Object.values(dummyListingImages)).size).toBe(dummyListingSlugs.length);
  });

  it("labels dummy listings unavailable and blocks their checkout", () => {
    expect(read("components/listing-card.tsx")).toContain("Unavailable - showcase only");
    expect(read("app/checkout/[listingId]/page.tsx")).toContain("isDummyListingSlug");
    expect(read("app/actions.ts")).toContain("dummy showcase listing and is unavailable for booking");
  });
});
