import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("proxy matcher", () => {
  it("does not bypass authentication for CSV exports", () => {
    const source = readFileSync(join(process.cwd(), "proxy.ts"), "utf8");
    const gateSource = readFileSync(join(process.cwd(), "src/lib/request-gate.ts"), "utf8");

    expect(source).not.toMatch(/\|csv\|/);
    expect(gateSource).toContain('pathname.startsWith("/dashboard/admin/")');
  });
});
