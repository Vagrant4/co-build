import { getAppMode } from "./app-mode";
import { LEGAL_DOCUMENT_VERSION } from "./legal-documents";

export function legalGateIssue(environment: NodeJS.ProcessEnv = process.env): string | null {
  const mode = getAppMode(environment);
  if (mode === "demo") return null;
  if (mode === "pilot") {
    return environment.LEGAL_PILOT_OWNER_ACKNOWLEDGED === "true"
      ? null
      : "The platform owner must acknowledge that pilot legal documents are unreviewed drafts.";
  }
  return environment.LEGAL_REVIEW_APPROVED_VERSION === LEGAL_DOCUMENT_VERSION
    ? null
    : `A Singapore lawyer must approve legal document version ${LEGAL_DOCUMENT_VERSION}.`;
}
