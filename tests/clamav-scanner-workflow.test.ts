import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ClamAV scanner release gate", () => {
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/clamav-scanner.yml"), "utf8");

  it("builds the real container and proves clean and EICAR behavior", () => {
    expect(workflow).toContain("docker build --tag spaceoncall-clamav:ci");
    expect(workflow).toContain("Wait for ClamAV signatures and health");
    expect(workflow).toContain("node scripts/verify-clamav-scanner.mjs");
    expect(workflow).toContain("docker rm --force");
  });
});
