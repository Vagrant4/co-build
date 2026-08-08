import { createHash } from "node:crypto";
import { prisma } from "./db";

function digest(previousDigest: string | null, events: unknown): string {
  return createHash("sha256").update(`${previousDigest ?? "GENESIS"}\n${JSON.stringify(events)}`).digest("hex");
}

async function checkpointEvents(fromAt: Date, throughAt: Date) {
  const events = await prisma.approvalEvent.findMany({
    where: { createdAt: { gt: fromAt, lte: throughAt } },
    select: { id: true, actorId: true, listingId: true, bookingId: true, target: true, decision: true, note: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  return events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }));
}

export async function createAuditCheckpoint(throughAt = new Date()): Promise<{ created: boolean; eventCount: number; digest?: string }> {
  const latest = await prisma.auditCheckpoint.findFirst({ orderBy: { throughAt: "desc" } });
  const fromAt = latest?.throughAt ?? new Date(0);
  const events = await checkpointEvents(fromAt, throughAt);
  if (!events.length) return { created: false, eventCount: 0 };
  const eventDigest = digest(latest?.digest ?? null, events);
  await prisma.auditCheckpoint.create({ data: { fromAt, throughAt, eventCount: events.length, previousDigest: latest?.digest ?? null, digest: eventDigest } });
  return { created: true, eventCount: events.length, digest: eventDigest };
}

export async function verifyAuditCheckpoints(): Promise<{ valid: boolean; checked: number; failedCheckpointId?: string }> {
  const checkpoints = await prisma.auditCheckpoint.findMany({ orderBy: { throughAt: "asc" } });
  for (const checkpoint of checkpoints) {
    const events = await checkpointEvents(checkpoint.fromAt, checkpoint.throughAt);
    const expected = digest(checkpoint.previousDigest, events);
    if (events.length !== checkpoint.eventCount || expected !== checkpoint.digest) {
      return { valid: false, checked: checkpoints.indexOf(checkpoint) + 1, failedCheckpointId: checkpoint.id };
    }
  }
  return { valid: true, checked: checkpoints.length };
}
