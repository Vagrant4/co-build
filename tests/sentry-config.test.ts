import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Sentry production monitoring", () => {
  it("initializes client and server monitoring without sending default PII", () => {
    const client = fs.readFileSync(path.join(root, "instrumentation-client.ts"), "utf8");
    const server = fs.readFileSync(path.join(root, "instrumentation.ts"), "utf8");

    expect(client).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(client).toContain("sendDefaultPii: false");
    expect(server).toContain("sendDefaultPii: false");
    expect(server).toContain("captureRequestError");
  });

  it("checks the canonical production health endpoint", () => {
    const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "production-uptime.yml"), "utf8");
    expect(workflow).toContain("https://spaceoncall.com/api/health");
    expect(workflow).not.toContain("co-build-sg.vercel.app");
  });

  it("keeps Sentry credentials in the pilot readiness gate", () => {
    const readiness = fs.readFileSync(path.join(root, "src", "lib", "pilot-readiness.ts"), "utf8");
    expect(readiness).toContain('"NEXT_PUBLIC_SENTRY_DSN"');
    expect(readiness).toContain('"SENTRY_ORG"');
    expect(readiness).toContain('"SENTRY_PROJECT"');
    expect(readiness).toContain('"SENTRY_AUTH_TOKEN"');
  });
});
