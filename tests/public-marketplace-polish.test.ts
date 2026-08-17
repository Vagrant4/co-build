import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
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
    const imageHashes: string[] = [];
    for (const imagePath of primaryImages) {
      const assetPath = join(root, "public", imagePath.replace(/^\/assets\//, "assets/"));
      expect(existsSync(assetPath), `${imagePath} should exist`).toBe(true);
      expect(statSync(assetPath).size, `${imagePath} should be a real photo`).toBeGreaterThan(100_000);
      imageHashes.push(createHash("sha256").update(readFileSync(assetPath)).digest("hex"));
    }
    expect(new Set(imageHashes).size).toBe(imageHashes.length);
  });

  it("labels dummy listings unavailable and blocks their checkout", () => {
    const listingCard = read("components/listing-card.tsx");
    expect(listingCard).toContain('isDummy ? "Unavailable" : "Available"');
    expect(listingCard).toContain('listing-card__signal--${isDummy ? "unavailable" : "available"}');
    expect(read("app/globals.css")).toContain(".listing-card__signal--available");
    expect(read("app/globals.css")).toContain(".listing-card__signal--unavailable");
    expect(listingCard).not.toContain("showcase only");
    expect(listingCard).not.toContain("Dummy listing");
    expect(listingCard).not.toContain("Host approval required");
    expect(read("app/checkout/[listingId]/page.tsx")).toContain("isDummyListingSlug");
    expect(read("app/actions.ts")).toContain("dummy showcase listing and is unavailable for booking");
    expect(read("src/lib/repository.ts")).toContain("photoUrls: dummyImage ? [dummyImage]");
  });

  it("uses internationally understandable capability-based listing fields", () => {
    const hostForm = read("app/dashboard/host/listings/new/page.tsx");
    const search = read("app/search/page.tsx");
    const homepage = read("app/page.tsx");

    expect(hostForm).toContain("Space category");
    expect(hostForm).toContain("Square metres (m²)");
    expect(hostForm).toContain("local classification (optional)");
    expect(hostForm).not.toContain('label="B1"');
    expect(hostForm).not.toContain('label="B2"');
    expect(search).not.toContain("Factory type");
    expect(homepage).not.toContain("B1/B2 suitability");
  });
});
