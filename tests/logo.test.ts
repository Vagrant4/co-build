import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Co-Build logo", () => {
  it("uses a reusable inline SVG logo component with responsive variants", () => {
    const logoPath = join(root, "components", "logo.tsx");

    expect(existsSync(logoPath)).toBe(true);

    const source = read("components/logo.tsx");
    expect(source).toContain("export function Logo");
    expect(source).toContain("<svg");
    expect(source).toContain("currentColor");
    expect(source).toContain("co-build-logo__accent");
    expect(source).toContain("variant?:");
  });

  it("renders the shared logo in the site header and create-account page", () => {
    expect(read("components/site-header.tsx")).toContain("<Logo");
    expect(read("app/create-account/page.tsx")).toContain("<Logo");
  });
});
