import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Stripe webhook security", () => {
  const route = readFileSync(join(process.cwd(), "app/api/stripe/webhook/route.ts"), "utf8");

  it("verifies signatures and deduplicates provider events", () => {
    expect(route).toContain("constructEvent");
    expect(route).toContain("stripe-signature");
    expect(route).toContain("stripeWebhookEvent.findUnique");
    expect(route).toContain("stripeWebhookEvent.create");
  });

  it("derives account mapping from signed Stripe objects", () => {
    expect(route).toContain("session.metadata?.appUserId");
    expect(route).toContain("subscription.metadata?.appUserId");
    expect(route).not.toContain("request.json()");
  });
});
