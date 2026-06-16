import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("homepage workspace photos", () => {
  it("shows workspace photos in the equipment section", () => {
    const source = read("app/page.tsx");

    expect(source).toContain("workspacePhotos");
    expect(source).toContain("workspace-photo-grid");
    expect(source).toContain("/assets/maker-bench.png");
    expect(source).toContain("/assets/medium-bay.png");
    expect(source).toContain("/assets/large-bay.png");
    expect(source).not.toContain("Forklift assistance");
    expect(source).not.toContain("Operator assistance");
  });
});
