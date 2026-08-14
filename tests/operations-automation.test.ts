import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("operations automation", () => {
  it("runs maintenance daily and a disposable restore drill monthly", () => {
    const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const restore = readFileSync(join(process.cwd(), ".github/workflows/database-restore-drill.yml"), "utf8");
    expect(vercel).toContain('"path": "/api/cron/maintenance"');
    expect(vercel).toContain('"schedule": "0 3 * * *"');
    expect(restore).toContain('cron: "0 19 1 * *"');
    expect(restore).toContain("Remove disposable restore database");
  });

  it("includes aggregate operating and billing signals in maintenance", () => {
    const route = readFileSync(join(process.cwd(), "app/api/cron/maintenance/route.ts"), "utf8");
    expect(route).toContain("collectOperationsSnapshot");
    expect(route).toContain("pastDueSubscriptions");
    expect(route).toContain("unscannedUploads");
    expect(route).not.toContain("originalName");
    expect(route).not.toContain("email:");
  });
});
