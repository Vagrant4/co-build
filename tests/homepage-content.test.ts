import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("homepage workspace photos", () => {
  it("shows sample workshop photos in the equipment section", () => {
    const source = read("app/page.tsx");
    const seedData = read("src/lib/seed-data.ts");

    expect(source).toContain("sampleWorkshopPhotos");
    expect(source).toContain("workspace-photo-grid");
    expect(source).toContain("sample workshop photos");
    expect(seedData).toContain("/assets/sample-workshop-photo-bench.png");
    expect(seedData).toContain("/assets/sample-workshop-photo-medium-bay.png");
    expect(seedData).toContain("/assets/sample-workshop-photo-large-bay.png");
    expect(source).not.toContain("Forklift assistance");
    expect(source).not.toContain("Operator assistance");
  });
});
