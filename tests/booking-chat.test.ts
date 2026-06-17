import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("booking chat", () => {
  it("adds booking message persistence to both Prisma schemas", () => {
    for (const schemaPath of ["prisma/schema.prisma", "prisma/schema.postgres.prisma"]) {
      const schema = read(schemaPath);

      expect(schema).toContain("model BookingMessage");
      expect(schema).toContain("messages        BookingMessage[]");
      expect(schema).toContain("senderId  String");
      expect(schema).toContain("body      String");
    }
  });

  it("renders renter and host chat boxes through one server action", () => {
    expect(read("app/actions.ts")).toContain("sendBookingMessageAction");
    expect(read("app/dashboard/user/page.tsx")).toContain("BookingChat");
    expect(read("app/dashboard/host/page.tsx")).toContain("BookingChat");
    expect(read("app/dashboard/user/page.tsx")).toContain("Chat with host");
    expect(read("app/dashboard/host/page.tsx")).toContain("Chat with renter");
    expect(read("components/booking-chat.tsx")).toContain("Keep all communication inside Co-Build chat");
    expect(read("app/actions.ts")).toContain("containsRestrictedContactDetail");
  });
});
