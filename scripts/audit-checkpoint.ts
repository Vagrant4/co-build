import { createAuditCheckpoint, verifyAuditCheckpoints } from "../src/lib/audit-checkpoints";
import { prisma } from "../src/lib/db";

async function main() {
  const verification = await verifyAuditCheckpoints();
  if (!verification.valid) throw new Error(`Audit checkpoint verification failed at ${verification.failedCheckpointId}.`);
  const result = await createAuditCheckpoint();
  console.log(JSON.stringify({ verification, checkpoint: result }, null, 2));
}

main().finally(() => prisma.$disconnect());
