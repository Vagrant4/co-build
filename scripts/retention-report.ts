import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const uploadDays = positiveDays("DATA_RETENTION_UPLOAD_DAYS");
  const accountDays = positiveDays("DATA_RETENTION_ACCOUNT_DAYS");
  const uploadBefore = new Date(Date.now() - uploadDays * 24 * 60 * 60 * 1000);
  const accountBefore = new Date(Date.now() - accountDays * 24 * 60 * 60 * 1000);
  const [expiredUploads, inactiveAccounts, openPrivacyDeletionRequests] = await Promise.all([
    prisma.upload.count({ where: { createdAt: { lt: uploadBefore }, uploadStatus: { not: "DELETED" } } }),
    prisma.user.count({ where: { updatedAt: { lt: accountBefore }, suspended: true } }),
    prisma.privacyRequest.count({ where: { type: "DELETION", status: { in: ["SUBMITTED", "IN_REVIEW"] } } })
  ]);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reportOnly: true, uploadBefore: uploadBefore.toISOString(), accountBefore: accountBefore.toISOString(), expiredUploads, inactiveAccounts, openPrivacyDeletionRequests, note: "No data was deleted. Legal holds, booking obligations, and approved retention rules must be checked before deletion." }, null, 2));
}

function positiveDays(key: string): number {
  const value = Number(process.env[key]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${key} must be a positive whole number.`);
  return value;
}

main().finally(() => prisma.$disconnect());
