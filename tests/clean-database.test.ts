import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const tempRoot = mkdtempSync(join(process.cwd(), "prisma", ".clean-db-"));
const databasePath = join(tempRoot, "clean.db").replaceAll("\\", "/");
let client!: PrismaClient;

describe("clean database boot", () => {
  beforeAll(async () => {
    const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    const sql = execFileSync(process.execPath, [prismaCli, "migrate", "diff", "--from-empty", "--to-schema-datamodel", join(process.cwd(), "prisma", "schema.prisma"), "--script"], {
      cwd: process.cwd(),
      env: { ...process.env, APP_MODE: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ci", CLERK_SECRET_KEY: "sk_test_ci" },
      stdio: "pipe"
    }).toString();
    client = new PrismaClient({ datasourceUrl: `file:${databasePath}` });
    await client.$connect();
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) {
      await client.$executeRawUnsafe(statement);
    }
  }, 120_000);

  afterAll(async () => {
    await client?.$disconnect();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("creates all tables without inserting demo identities or inventory", async () => {
    const [users, listings, conversations] = await Promise.all([
      client.user.count(),
      client.listing.count(),
      client.conversation.count()
    ]);
    expect({ users, listings, conversations }).toEqual({ users: 0, listings: 0, conversations: 0 });
  });
});
