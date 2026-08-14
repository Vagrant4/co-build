import { describe, expect, it } from "vitest";
import { isAvailableWhileLaunchPaused, isPublicLaunchEnabled, launchPausedResponse } from "../src/lib/public-launch";

describe("public launch lock", () => {
  it("defaults closed in pilot and production", () => {
    expect(isPublicLaunchEnabled({} as NodeJS.ProcessEnv, "pilot")).toBe(false);
    expect(isPublicLaunchEnabled({} as NodeJS.ProcessEnv, "production")).toBe(false);
    expect(isPublicLaunchEnabled({ PUBLIC_LAUNCH_ENABLED: "false" } as NodeJS.ProcessEnv, "production")).toBe(false);
  });

  it("requires an explicit true value outside demo", () => {
    expect(isPublicLaunchEnabled({ PUBLIC_LAUNCH_ENABLED: "true" } as NodeJS.ProcessEnv, "pilot")).toBe(true);
    expect(isPublicLaunchEnabled({} as NodeJS.ProcessEnv, "demo")).toBe(true);
  });

  it.each([
    "/", "/search", "/listings/example", "/checkout/example", "/create-account",
    "/dashboard/user", "/dashboard/host", "/api/uploads/reserve"
  ])("blocks public route %s", (pathname) => {
    expect(isAvailableWhileLaunchPaused(pathname)).toBe(false);
  });

  it.each([
    "/admin/sign-in", "/dashboard/admin", "/dashboard/admin/launch-setup", "/sign-in",
    "/api/health", "/api/stripe/webhook", "/api/cron/maintenance", "/api/ops/alerts", "/__clerk/callback"
  ])("keeps recovery route %s available", (pathname) => {
    expect(isAvailableWhileLaunchPaused(pathname)).toBe(true);
  });

  it("returns a non-cacheable maintenance response", async () => {
    const response = launchPausedResponse();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(await response.text()).toContain("Public access is paused");
  });
});
