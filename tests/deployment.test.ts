import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("production deployment setup", () => {
  it("keeps a Postgres Prisma schema for live hosting without changing the local SQLite demo", () => {
    const schemaPath = join(root, "prisma", "schema.postgres.prisma");

    expect(existsSync(schemaPath)).toBe(true);

    const postgresSchema = read("prisma/schema.postgres.prisma");
    expect(postgresSchema).toContain('provider = "postgresql"');
    expect(postgresSchema).toContain('url      = env("DATABASE_URL")');
    expect(postgresSchema).toContain("model Booking");

    const localSchema = read("prisma/schema.prisma");
    expect(localSchema).toContain('provider = "sqlite"');
    expect(localSchema).toContain('url      = "file:./dev.db"');
  });

  it("defines a production build command and live environment variable checklist", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

    expect(packageJson.scripts["prisma:generate:prod"]).toBe(
      "prisma generate --schema prisma/schema.postgres.prisma"
    );
    expect(packageJson.scripts["db:push:prod"]).toBe(
      "prisma db push --schema prisma/schema.postgres.prisma"
    );
    expect(packageJson.scripts["vercel-build"]).toBe("npm run prisma:generate:prod && next build");

    expect(read("vercel.json")).toContain('"buildCommand": "npm run vercel-build"');

    const envExample = read(".env.example");
    expect(envExample).toContain("DATABASE_URL=");
    expect(envExample).toContain("NEXT_PUBLIC_APP_URL=");
    expect(envExample).toContain("STRIPE_SECRET_KEY=");
    expect(envExample).toContain("STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID=");
  });
});
