import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("subscription payment guidance", () => {
  const panel = readFileSync(join(process.cwd(), "components/platform-subscription-panel.tsx"), "utf8");

  it("warns India cardholders about recurring mandate compatibility before Stripe Checkout", () => {
    expect(panel).toContain("Visa or Mastercard");
    expect(panel).toContain("India-issued Maestro");
    expect(panel).toContain("online international recurring payments");
  });
});
