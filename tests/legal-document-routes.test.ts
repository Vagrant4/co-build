import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("legal document routes", () => {
  it("protects and audits private booking document downloads", () => {
    const route = read("app/api/bookings/[bookingId]/documents/booking-summary/route.ts");

    expect(route).toContain("requireBookingParticipant(bookingId)");
    expect(route).toContain("booking_document_download:pilot_summary");
    expect(route).toContain('"Cache-Control": "private, no-store"');
    expect(route).not.toMatch(/\.email|\.mobile/);
  });

  it("links booking downloads for renter, host, and admin", () => {
    for (const path of [
      "app/dashboard/user/page.tsx",
      "app/dashboard/host/page.tsx",
      "app/dashboard/admin/page.tsx"
    ]) {
      expect(read(path)).toContain("/documents/booking-summary");
      expect(read(path)).toContain("/agreement");
    }
  });

  it("protects the on-screen booking agreement", () => {
    const page = read("app/dashboard/bookings/[bookingId]/agreement/page.tsx");

    expect(page).toContain("requireBookingParticipant(bookingId)");
    expect(page).toContain("Renter-Host Booking Agreement");
  });

  it("publishes a Legal Centre and versioned public PDF route", () => {
    expect(read("app/layout.tsx")).toContain('href="/legal"');
    expect(read("app/legal/page.tsx")).toContain("Pilot Legal Centre");
    expect(read("app/legal/documents/[slug]/route.ts")).toContain('"Content-Type": "application/pdf"');
  });

  it("does not claim that new add-on records were emailed", () => {
    const actions = read("app/actions.ts");
    const fabrication = read("src/lib/fabrication.ts");

    expect(actions).toContain("emailedTo: null");
    expect(actions).toContain("emailedAt: null");
    expect(fabrication).not.toContain("Contract emailed to:");
  });
});
