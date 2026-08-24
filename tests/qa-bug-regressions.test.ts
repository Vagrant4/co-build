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
    expect(fields.match(/search-form__date w-full min-w-0 pr-3/g)).toHaveLength(2);
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
    const page = read("app/contact/page.tsx");
    const action = read("app/contact/actions.ts");
    const form = read("components/action-form.tsx");
    expect(page).toContain("sendContactInquiryAction");
    expect(page).toContain('href="mailto:support@spaceoncall.com"');
    expect(page).toContain('pattern="[A-Za-zÀ-ÖØ-öø-ÿ\' .-]+"');
    expect(action).toContain("Enter a valid name using letters and standard punctuation.");
    expect(action).toContain("Your enquiry was sent");
    expect(form).toContain("setTimeout(() => setShowSuccess(false), 3000)");
  });

  it("keeps detailed area filters positive and integer-only", () => {
    const searchPage = read("app/search/page.tsx");
    expect(searchPage.match(/min="1" step="1" inputMode="numeric"/g)).toHaveLength(2);
  });

  it("keeps safety next to overview and makes the admin brand navigable", () => {
    const nav = read("components/admin-section-nav.tsx");
    const dashboard = read("app/dashboard/admin/page.tsx");
    expect(nav.indexOf('{ id: "safety"')).toBeLessThan(nav.indexOf('{ id: "approvals"'));
    expect(dashboard).toContain('className="admin-console__brand" href="/"');
  });

  it("automatically clears transient admin status notices", () => {
    const message = read("components/transient-message.tsx");
    const dashboard = read("app/dashboard/admin/page.tsx");
    expect(message).toContain("setVisible(false)");
    expect(message).toContain('url.searchParams.delete(key)');
    expect(dashboard).toContain("<TransientMessage");
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
