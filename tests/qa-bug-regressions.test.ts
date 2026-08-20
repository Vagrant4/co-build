import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { renderTextDocumentPdf } from "../src/lib/pdf-document";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("QA bug regressions", () => {
  it("keeps create-account and email-verification headings visible", () => {
    const page = read("app/sign-up/[[...sign-up]]/page.tsx");
    expect(page).toContain("Create your account");
    expect(page).toContain("Verify your email");
    expect(page).toContain("spaceoncall-clerk-title");
  });

  it("enforces check-in and check-out minimum dates in the browser", () => {
    const fields = read("components/search-date-fields.tsx");
    expect(fields).toContain("min={today}");
    expect(fields).toContain("min={minimumCheckOut}");
    expect(fields).toContain('value ? new Date(`${value}T00:00:00`) : new Date()');
    expect(fields).toContain("checkOut <= value");
  });

  it("hides dummy showcase inventory from available search results", () => {
    const repository = read("src/lib/repository.ts");
    expect(repository).toContain("slug: { notIn: [...dummyListingSlugs] }");
  });

  it("excludes listings with active bookings that overlap the requested dates", () => {
    const repository = read("src/lib/repository.ts");
    const searchPage = read("app/search/page.tsx");
    expect(searchPage).toContain("checkIn: one(params.checkIn)");
    expect(searchPage).toContain("checkOut: one(params.checkOut)");
    expect(repository).toContain("status: { in: ACTIVE_BOOKING_STATUSES }");
    expect(repository).toContain("startAt: { lt: requestedWindow.endAt }");
    expect(repository).toContain("endAt: { gt: requestedWindow.startAt }");
  });

  it("submits contact enquiries and provides visible result states", () => {
    expect(read("app/contact/page.tsx")).toContain("sendContactInquiryAction");
    expect(read("app/contact/actions.ts")).toContain("Your enquiry was sent");
  });

  it("routes favicon through Clerk middleware", () => {
    expect(read("proxy.ts")).toContain('"/favicon.ico"');
  });

  it("keeps admin white surfaces paired with dark readable text", () => {
    const css = read("app/globals.css");
    expect(css).toContain("main.admin-console h1");
    expect(css).toContain("main.admin-console .bg-white");
    expect(css).toContain("body.spaceoncall-theme main.admin-console { min-height: 100vh; background: #f4f5f7; color: #17191c; }");
    expect(css).toContain(".admin-console__pulse strong { color: #fff !important; }");
  });

  it("renders long unbroken PDF values within the document", async () => {
    const bytes = await renderTextDocumentPdf({
      title: "Booking record with an intentionally long title that must wrap safely inside the page header",
      body: `Agreement SHA-256: ${"a".repeat(256)}\n${"LONGVALUE".repeat(120)}`,
      version: "2026-08-20",
      status: "PILOT DOCUMENT REQUIRING REVIEW BEFORE OPERATIONAL USE"
    });
    const pdf = await PDFDocument.load(bytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(font.widthOfTextAtSize("a".repeat(48), 9.5)).toBeLessThan(595.28 - 104);
  });
});
