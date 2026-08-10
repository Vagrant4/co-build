import { legalGateIssue } from "./legal-gate";
import { prisma } from "./db";
import { privateStorage } from "./storage";

const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionExecutionIssues(environment: NodeJS.ProcessEnv = process.env): string[] {
  const issues: string[] = [];
  if (environment.RETENTION_EXECUTION_ENABLED !== "true") issues.push("RETENTION_EXECUTION_ENABLED must be true.");
  const legalIssue = legalGateIssue(environment);
  if (legalIssue) issues.push(legalIssue);
  const days = Number(environment.DATA_RETENTION_UPLOAD_DAYS);
  if (!Number.isSafeInteger(days) || days <= 0) issues.push("DATA_RETENTION_UPLOAD_DAYS must be a positive whole number.");
  return issues;
}

export async function executeApprovedRetention(environment: NodeJS.ProcessEnv = process.env): Promise<{ examined: number; deletedObjects: number; markedDeleted: number }> {
  const issues = retentionExecutionIssues(environment);
  if (issues.length) throw new Error(`Retention execution blocked: ${issues.join(" ")}`);
  const cutoff = new Date(Date.now() - Number(environment.DATA_RETENTION_UPLOAD_DAYS) * DAY_MS);
  const candidates = await prisma.upload.findMany({
    where: { createdAt: { lt: cutoff }, uploadStatus: { in: ["REJECTED", "DELETED"] } },
    select: { id: true, objectKey: true, storageProvider: true },
    take: 250
  });
  let deletedObjects = 0;
  let markedDeleted = 0;
  const storageCandidates = candidates.filter((candidate) => candidate.storageProvider === "VERCEL_BLOB" && candidate.objectKey);
  const storage = storageCandidates.length ? privateStorage() : null;

  for (const candidate of candidates) {
    if (candidate.objectKey && candidate.storageProvider === "VERCEL_BLOB" && storage) {
      await storage.delete(candidate.objectKey);
      deletedObjects += 1;
    }
    const result = await prisma.upload.updateMany({ where: { id: candidate.id, uploadStatus: { in: ["REJECTED", "DELETED"] } }, data: { uploadStatus: "DELETED", deletedAt: new Date(), objectKey: null } });
    markedDeleted += result.count;
  }
  return { examined: candidates.length, deletedObjects, markedDeleted };
}
