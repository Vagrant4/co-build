import { describe, expect, it } from "vitest";
import {
  LEGAL_DOCUMENT_REVIEW_STATUS,
  LEGAL_DOCUMENT_VERSION,
  buildBookingDocument,
  getLegalDocument,
  legalDocuments,
  renderLegalDocumentText
} from "../src/lib/legal-documents";
import { renderTextDocumentPdf } from "../src/lib/pdf-document";

describe("pilot legal documents", () => {
  it("publishes unique, versioned drafts that require legal review", () => {
    const slugs = legalDocuments.map((document) => document.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(LEGAL_DOCUMENT_VERSION).toMatch(/^pilot-/);
    expect(LEGAL_DOCUMENT_REVIEW_STATUS).toBe("DRAFT - LAWYER REVIEW REQUIRED");
    expect(legalDocuments.length).toBeGreaterThanOrEqual(8);

    for (const document of legalDocuments) {
      const text = renderLegalDocumentText(document);
      expect(document.version).toBe(LEGAL_DOCUMENT_VERSION);
      expect(text).toContain(LEGAL_DOCUMENT_REVIEW_STATUS);
      expect(text).toContain("not legal advice");
      expect(document.sections.length).toBeGreaterThan(2);
    }
  });

  it("covers the minimum privacy and marketplace controls", () => {
    const privacy = renderLegalDocumentText(getLegalDocument("privacy-notice")!);
    const terms = renderLegalDocumentText(getLegalDocument("marketplace-terms")!);

    expect(privacy).toMatch(/data protection officer/i);
    expect(privacy).toMatch(/retention/i);
    expect(privacy).toMatch(/access or correct/i);
    expect(privacy).toMatch(/data breach/i);
    expect(terms).toMatch(/marketplace/i);
    expect(terms).toMatch(/host and renter contract directly/i);
    expect(terms).toMatch(/no deal commission/i);
    expect(terms).toMatch(/not a party to the space booking agreement/i);
    expect(terms).toMatch(/to the fullest extent permitted by applicable law/i);
    expect(terms).toMatch(/cannot lawfully be excluded/i);
  });

  it("builds a private booking document without contact details", () => {
    const document = buildBookingDocument({
      bookingId: "booking-100",
      createdAt: new Date("2026-08-07T02:00:00.000Z"),
      listingTitle: "B2 Fabrication Bay",
      listingAddress: "Tuas, Singapore",
      hostName: "Marcus Lim",
      hostCompanyName: "West Workshop Pte Ltd",
      renterName: "Aisha Tan",
      renterCompanyName: "Aisha Signage",
      durationDays: 30,
      workType: "Metal fabrication",
      riskLevel: "ADMIN_APPROVAL",
      status: "APPROVED_FOR_PAYMENT",
      rentalTotal: 2200,
      deposit: 1000,
      cleaningFee: 150,
      addonTotal: 275,
      grandTotal: 3625,
      safetyAcceptedAt: new Date("2026-08-07T02:15:00.000Z"),
      renterDealConfirmedAt: new Date("2026-08-07T03:00:00.000Z"),
      hostDealConfirmedAt: null,
      cancellationPolicy: "Seven days notice required.",
      addons: [{ name: "Compressor", price: 275 }],
      additionalRequirements: [{ detail: "After-hours access", status: "APPROVED_FOR_PAYMENT", quotedRate: 120 }]
    });

    expect(document).toContain("PRIVATE PILOT BOOKING RECORD");
    expect(document).toContain("NOT A SIGNED LEASE OR EXECUTED AGREEMENT");
    expect(document).toContain("B2 Fabrication Bay");
    expect(document).toContain("S$3,625");
    expect(document).toContain("Renter confirmed; host pending");
    expect(document).toContain("Compressor - S$275");
    expect(document).toContain("CONTRACTING PARTIES AND PLATFORM ROLE");
    expect(document).toContain("between the host and renter identified in this record");
    expect(document).toContain("acknowledgement and record purposes");
    expect(document).toContain("SpaceOnCall is not a party to the space booking agreement");
    expect(document).toContain("DISPUTES AND PLATFORM LIABILITY");
    expect(document).toContain("To the fullest extent permitted by applicable law");
    expect(document).toContain("cannot lawfully be excluded or limited");
    expect(document).not.toMatch(/@|mobile|phone/i);
  });

  it("renders a valid PDF document", async () => {
    const bytes = await renderTextDocumentPdf({
      title: "Co-Build Test Document",
      body: "A short document body.",
      version: LEGAL_DOCUMENT_VERSION,
      status: LEGAL_DOCUMENT_REVIEW_STATUS
    });

    expect(Buffer.from(bytes).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
