import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "../src/lib/cron-auth";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("maintenance cron authorization", () => {
  it("fails closed without the exact configured bearer secret", () => {
    expect(isAuthorizedCronRequest(null, undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer wrong", "correct")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer correct", "correct")).toBe(true);
  });

  it("protects the monthly provider acceptance route and schedules it", () => {
    const route = readFileSync(join(process.cwd(), "app/api/cron/provider-acceptance/route.ts"), "utf8");
    const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: Array<{ path: string }> };
    expect(route).toContain("isAuthorizedCronRequest");
    expect(route).not.toContain("process.env.CRON_SECRET ===");
    expect(vercel.crons.some((cron) => cron.path === "/api/cron/provider-acceptance")).toBe(true);
  });
});
