import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("listing card UI", () => {
  it("uses industrial card structure for scannable listing results", () => {
    const source = read("components/listing-card.tsx");
    const css = read("app/globals.css");

    expect(source).toContain("listing-card");
    expect(source).toContain("listing-card__media");
    expect(source).toContain("listing-card__specs");
    expect(source).toContain("View details");
    expect(css).toContain(".listing-card");
    expect(css).toContain(".listing-card__media::after");
    expect(css).toContain(".listing-card__specs");
  });
});
