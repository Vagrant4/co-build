import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertAuthenticationConfigured, getAppMode } from "../src/lib/app-mode";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("application mode boundary", () => {
  it("allows demo switching only through an HTTP-only demo session", () => {
    const route = read("app/demo/session/route.ts");
    expect(route).toContain("if (!isDemoMode())");
    expect(route).toContain("httpOnly: true");
    expect(read("app/layout.tsx")).toContain("Demo mode: showcase accounts");
  });

  it("fails closed when pilot or production auth configuration is missing", () => {
    expect(() => assertAuthenticationConfigured({ NODE_ENV: "production", APP_MODE: "pilot" })).toThrow(/managed authentication configuration/);
    expect(() => assertAuthenticationConfigured({ NODE_ENV: "production", APP_MODE: "production" })).toThrow(/CLERK_SECRET_KEY/);
    expect(() => getAppMode({ NODE_ENV: "development", APP_MODE: "typo" })).toThrow(/Invalid APP_MODE/);
    expect(getAppMode({ NODE_ENV: "test" })).toBe("demo");
  });

  it("does not submit actor identity from protected forms", () => {
    const files = ["app/actions.ts", "components/booking-chat.tsx", "components/listing-chat.tsx", "app/checkout/[listingId]/page.tsx"];
    for (const path of files) {
      const source = read(path);
      expect(source).not.toContain('name="actorId"');
      expect(source).not.toContain('name="senderId"');
      expect(source).not.toContain('name="senderRole"');
      expect(source).not.toContain('name="hostId"');
    }
    expect(read("app/actions.ts")).not.toMatch(/optionalString\(formData, "(?:userId|hostId|actorId|senderId|senderRole|role)"\)/);
  });
});
