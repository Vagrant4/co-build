import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "../src/lib/cron-auth";

describe("maintenance cron authorization", () => {
  it("fails closed without the exact configured bearer secret", () => {
    expect(isAuthorizedCronRequest(null, undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer wrong", "correct")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer correct", "correct")).toBe(true);
  });
});
