import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("search form layout", () => {
  it("uses a dedicated responsive grid for aligned search controls", () => {
    const source = read("components/search-form.tsx");

    expect(source).toContain("search-form__controls");
    expect(source).toContain("search-form__size");
    expect(source).toContain("search-form__button");
    expect(source).toContain("search-form__advanced");
    expect(source).toContain("Equipment add-ons");
    expect(source).toContain("<summary");
    expect(source).not.toContain("lg:grid-cols-8");
  });

  it("keeps native select text and arrow spacing stable", () => {
    const css = read("app/globals.css");

    expect(css).toContain("select.field");
    expect(css).toContain("appearance: none");
    expect(css).toContain("padding-right: 2.35rem");
    expect(css).toContain("repeat(auto-fit, minmax(13.5rem, 1fr))");
    expect(css).toContain("min-height: 2.9rem");
    expect(css).toContain(".search-form__advanced");
    expect(css).toContain(".search-form__advanced[open]");
  });
});
