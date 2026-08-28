import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("host listing submission guardrails", () => {
  it("requires at least one workspace photo in both the form and server action", () => {
    const page = read("app/dashboard/host/listings/new/page.tsx");
    const actions = read("app/actions.ts");

    expect(page).toMatch(/type="LISTING_PHOTO"[^>]+required/);
    expect(actions).toContain("if (photoUploadIds.length === 0)");
    expect(actions).toContain("Upload at least one workspace photo");
  });

  it("shows formats and the effective upload limit", () => {
    const page = read("app/dashboard/host/listings/new/page.tsx");
    const field = read("components/private-upload-field.tsx");

    expect(page).toContain('getUploadPolicy("LISTING_PHOTO")');
    expect(page).toContain('getUploadPolicy("FLOOR_PLAN")');
    expect(field).toContain("Accepted:");
    expect(field).toContain("Maximum");
  });
});

describe("admin action locking", () => {
  it("disables every shared submit button while any action is pending", () => {
    const button = read("components/submit-button.tsx");
    const store = read("components/action-pending-store.ts");

    expect(button).toContain("useSyncExternalStore");
    expect(button).toContain("disabled={disabled || pending || anyActionPending}");
    expect(store).toContain("pendingActions += 1");
    expect(store).toContain("pendingActions = Math.max(0, pendingActions - 1)");
  });
});
