import { PrismaClient } from "@prisma/client";
import { privateStorage } from "../src/lib/storage";
import { uploadsAreEnabled } from "../src/lib/uploads";

const prisma = new PrismaClient();

async function main() {
  const execute = process.argv.includes("--execute");
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await prisma.upload.findMany({ where: { uploadStatus: "PENDING", createdAt: { lt: cutoff } }, select: { id: true, objectKey: true } });
  const deletedWithObjects = await prisma.upload.findMany({ where: { uploadStatus: "DELETED", objectKey: { not: null } }, select: { id: true, objectKey: true } });
  const candidates = [...stale, ...deletedWithObjects];
  console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", stalePending: stale.length, deletedObjects: deletedWithObjects.length, storageConfigured: uploadsAreEnabled() }, null, 2));
  if (!execute || !candidates.length) return;
  if (!uploadsAreEnabled()) throw new Error("Private storage must be configured before executing cleanup.");
  const storage = privateStorage();
  for (const candidate of candidates) {
    if (candidate.objectKey) await storage.delete(candidate.objectKey);
    await prisma.upload.update({ where: { id: candidate.id }, data: { uploadStatus: "DELETED", deletedAt: new Date(), objectKey: null } });
  }
  console.log(`Cleaned ${candidates.length} upload records.`);
}

main().finally(() => prisma.$disconnect());
