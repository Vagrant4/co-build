import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("private storage release gate", () => {
  it("contains no runtime filesystem upload writer", () => {
    const uploads = read("src/lib/uploads.ts");
    expect(uploads).not.toContain("writeFile");
    expect(uploads).not.toContain("mkdir");
    expect(uploads).not.toContain("node:fs");
  });

  it("serves private objects only through an authorized no-store route", () => {
    const route = read("app/api/uploads/[uploadId]/route.ts");
    expect(route).toContain("canAccessUpload");
    expect(route).toContain("privateDownloadHeaders");
    expect(route).toContain("isUploadDownloadable(upload)");
  });

  it("uses a reviewed Postgres migration tree and never db push in production", () => {
    expect(existsSync(join(process.cwd(), "prisma/postgres/migrations/20260728090000_baseline/migration.sql"))).toBe(true);
    const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
    expect(scripts["db:deploy:prod"]).toContain("migrate deploy");
    expect(scripts["vercel-build"]).not.toContain("db:push");
    expect(scripts["vercel-build"]).not.toContain("migrate deploy");
  });
});
