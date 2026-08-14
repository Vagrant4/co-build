import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { createScannerServer, isAuthorized, parseClamResponse } from "../services/clamav-scanner/server.mjs";

const servers: ReturnType<typeof createScannerServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("private ClamAV scanner service", () => {
  it("parses clean and infected clamd responses", () => {
    expect(parseClamResponse("stream: OK\0")).toEqual({ safe: true, signature: null });
    expect(parseClamResponse("stream: Win.Test.EICAR_HDB-1 FOUND\0")).toEqual({ safe: false, signature: "Win.Test.EICAR_HDB-1" });
    expect(() => parseClamResponse("stream: scan error ERROR\0")).toThrow(/invalid/i);
  });

  it("compares bearer credentials without accepting missing values", () => {
    expect(isAuthorized("Bearer a-secret-value", "a-secret-value")).toBe(true);
    expect(isAuthorized("Bearer wrong", "a-secret-value")).toBe(false);
    expect(isAuthorized(undefined, "a-secret-value")).toBe(false);
  });

  it("rejects unsigned scans and returns only bounded scan results", async () => {
    const token = "scanner-test-token-with-at-least-32-characters";
    const server = createScannerServer({ token, healthCheck: async () => true, scanner: async () => ({ safe: true, signature: null }) });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test scanner did not bind to TCP.");
    const url = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${url}/health`)).status).toBe(200);
    expect((await fetch(`${url}/scan`, { method: "POST", body: "clean", headers: { "Content-Length": "5" } })).status).toBe(401);
    const response = await fetch(`${url}/scan`, { method: "POST", body: "clean", headers: { Authorization: `Bearer ${token}`, "Content-Length": "5" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ safe: true });
  });
});
