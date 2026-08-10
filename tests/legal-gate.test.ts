import { describe, expect, it } from "vitest";
import { legalGateIssue } from "../src/lib/legal-gate";
import { LEGAL_DOCUMENT_VERSION } from "../src/lib/legal-documents";

describe("legal release gate", () => {
  it("allows an explicitly acknowledged invite-only pilot draft", () => {
    expect(legalGateIssue({ APP_MODE: "pilot", LEGAL_PILOT_OWNER_ACKNOWLEDGED: "true" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("blocks a pilot without owner acknowledgement", () => {
    expect(legalGateIssue({ APP_MODE: "pilot" } as NodeJS.ProcessEnv)).toContain("unreviewed drafts");
  });

  it("does not allow the pilot exception to bypass production legal review", () => {
    const environment = { APP_MODE: "production", LEGAL_PILOT_OWNER_ACKNOWLEDGED: "true" } as NodeJS.ProcessEnv;
    expect(legalGateIssue(environment)).toContain(LEGAL_DOCUMENT_VERSION);
    environment.LEGAL_REVIEW_APPROVED_VERSION = LEGAL_DOCUMENT_VERSION;
    expect(legalGateIssue(environment)).toBeNull();
  });
});
