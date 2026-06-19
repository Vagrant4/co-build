import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("listing chat", () => {
  it("adds listing message persistence to both Prisma schemas", () => {
    for (const schemaPath of ["prisma/schema.prisma", "prisma/schema.postgres.prisma"]) {
      const schema = read(schemaPath);

      expect(schema).toContain("model ListingMessage");
      expect(schema).toContain("listingMessages");
      expect(schema).toContain("sentListingMessages");
      expect(schema).toContain("listingId String");
      expect(schema).toContain("body      String");
    }
  });

  it("places pre-deal chat on listing detail and host listing cards", () => {
    expect(read("app/actions.ts")).toContain("sendListingMessageAction");
    expect(read("components/listing-chat.tsx")).toContain("Pre-deal chat");
    expect(read("components/listing-chat.tsx")).toContain("sendListingMessageAction");
    expect(read("app/listings/[slug]/page.tsx")).toContain("ListingChat");
    expect(read("app/listings/[slug]/page.tsx")).toContain("Chat with host before booking");
    expect(read("app/dashboard/host/page.tsx")).toContain("Chat with renter before deal");
    expect(read("app/dashboard/host/page.tsx")).toContain('variant="compact"');
    expect(read("components/listing-chat.tsx")).toContain('variant?: "full" | "compact"');
  });
});
