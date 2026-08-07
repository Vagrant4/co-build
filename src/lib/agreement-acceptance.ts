import { createHash } from "node:crypto";

export function bookingDocumentDigest(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function hasCurrentAgreementAcceptance(
  acceptances: Array<{ userId: string; documentHash: string }>,
  participantIds: string[],
  documentHash: string
): boolean {
  const accepted = new Set(acceptances.filter((item) => item.documentHash === documentHash).map((item) => item.userId));
  return participantIds.every((participantId) => accepted.has(participantId));
}
