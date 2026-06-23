import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const samplePhotoPaths = [
  "public/assets/sample-workshop-photo-bench.png",
  "public/assets/sample-workshop-photo-small-bay.png",
  "public/assets/sample-workshop-photo-medium-bay.png",
  "public/assets/sample-workshop-photo-large-bay.png"
];

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("sample workshop photos", () => {
  it("stores four local no-human workshop photo assets", () => {
    for (const assetPath of samplePhotoPaths) {
      expect(existsSync(join(root, assetPath))).toBe(true);
    }
  });

  it("feeds sample workshop photos into homepage, seed listings, and host listing fallbacks", () => {
    const seedData = read("src/lib/seed-data.ts");
    const homepage = read("app/page.tsx");
    const actions = read("app/actions.ts");

    expect(seedData).toContain("sampleWorkshopPhotos");
    for (const assetPath of samplePhotoPaths) {
      const publicPath = assetPath.replace("public", "");
      expect(seedData).toContain(publicPath);
      expect(actions).toContain(publicPath);
    }

    expect(homepage).toContain("sampleWorkshopPhotos");
    expect(homepage).toContain("sample workshop photos");
    expect(homepage).not.toContain('src: "/assets/maker-bench.png"');
    expect(homepage).not.toContain('src: "/assets/medium-bay.png"');
    expect(homepage).not.toContain('src: "/assets/large-bay.png"');
  });
});