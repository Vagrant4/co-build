import { PrismaClient } from "@prisma/client";
import { getAppMode } from "../src/lib/app-mode";
import { buildOpsWarnings } from "../src/lib/ops-signals";
import { privateStorage } from "../src/lib/storage";
import { uploadsAreEnabled } from "../src/lib/uploads";

const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleBefore = new Date(Date.now() - 60 * 60 * 1000);
  const [usersByRole, activeSubscriptions, bookingsByStatus, recentBookings, activeBookings, uploadsByType, uploadsByStatus, uploadBytes, stalePending, missingMetadata] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { platformSubscriptionStatus: "ACTIVE", suspended: false } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.count({ where: { createdAt: { gte: since } } }),
    prisma.booking.count({ where: { status: { in: ["PENDING_HOST", "PENDING_ADMIN_HIGH_RISK", "APPROVED_FOR_PAYMENT", "PAYMENT_SUBMITTED", "PAID_CONFIRMED", "CHECKED_IN"] } } }),
    prisma.upload.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.upload.groupBy({ by: ["uploadStatus"], _count: { _all: true } }),
    prisma.upload.aggregate({ _sum: { sizeBytes: true } }),
    prisma.upload.count({ where: { uploadStatus: "PENDING", createdAt: { lt: staleBefore } } }),
    prisma.upload.count({ where: { uploadStatus: "AVAILABLE", OR: [{ objectKey: null }, { contentType: null }, { sizeBytes: null }, { checksumSha256: null }] } })
  ]);

  const database = await databaseSignals();
  const storageConsistency = await storageSignals();
  const report = {
    generatedAt: new Date().toISOString(),
    appMode: getAppMode(),
    users: Object.fromEntries(usersByRole.map((row) => [row.role, row._count._all])),
    activeRecurringSubscriptions: activeSubscriptions,
    bookings: {
      byStatus: Object.fromEntries(bookingsByStatus.map((row) => [row.status, row._count._all])),
      active: activeBookings,
      createdLast30Days: recentBookings
    },
    uploads: {
      byType: Object.fromEntries(uploadsByType.map((row) => [row.type, row._count._all])),
      byStatus: Object.fromEntries(uploadsByStatus.map((row) => [row.uploadStatus, row._count._all])),
      totalBytesRecorded: uploadBytes._sum.sizeBytes || 0,
      stalePendingOlderThanOneHour: stalePending,
      availableMissingRequiredMetadata: missingMetadata,
      missingObjects: storageConsistency.missingObjects,
      orphanObjects: storageConsistency.orphanObjects,
      privateStorageConfigured: uploadsAreEnabled()
    },
    database,
    backups: { restoreTestVerified: false, note: "Verify provider backups and complete a restore drill before pilot data." },
    warnings: buildOpsWarnings({ activeSubscriptions, recentBookings, stalePending, missingMetadata, uploadBytes: uploadBytes._sum.sizeBytes || 0, uploadsConfigured: uploadsAreEnabled() })
  };

  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else printMarkdown(report);
}

async function storageSignals(): Promise<{ missingObjects: number | null; orphanObjects: number | null }> {
  if (!uploadsAreEnabled()) return { missingObjects: null, orphanObjects: null };
  try {
    const rows = await prisma.upload.findMany({ where: { storageProvider: "VERCEL_BLOB", uploadStatus: { not: "DELETED" }, objectKey: { not: null } }, select: { objectKey: true } });
    const databaseKeys = new Set(rows.flatMap((row) => row.objectKey ? [row.objectKey] : []));
    const blobKeys = new Set(await privateStorage().listKeys(`${getAppMode()}/`));
    return {
      missingObjects: [...databaseKeys].filter((key) => !blobKeys.has(key)).length,
      orphanObjects: [...blobKeys].filter((key) => !databaseKeys.has(key)).length
    };
  } catch {
    return { missingObjects: null, orphanObjects: null };
  }
}

async function databaseSignals() {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isPostgres = databaseUrl.startsWith("postgresql:") || databaseUrl.startsWith("postgres:");
  let databaseSizeBytes: number | null = null;
  let currentConnections: number | null = null;
  let maxConnections: number | null = null;
  if (isPostgres) {
    try {
      const [size] = await prisma.$queryRawUnsafe<Array<{ size: bigint }>>("SELECT pg_database_size(current_database()) AS size");
      const [connections] = await prisma.$queryRawUnsafe<Array<{ current: bigint; maximum: string }>>("SELECT count(*) AS current, current_setting('max_connections') AS maximum FROM pg_stat_activity");
      databaseSizeBytes = Number(size?.size ?? 0);
      currentConnections = Number(connections?.current ?? 0);
      maxConnections = Number(connections?.maximum ?? 0);
    } catch {
      // Limited database roles may not expose connection statistics.
    }
  }
  return { provider: isPostgres ? "postgresql" : "sqlite", pooledEndpointDetected: isPostgres && databaseUrl.includes("-pooler"), databaseSizeBytes, currentConnections, maxConnections };
}

function printMarkdown(report: Awaited<ReturnType<typeof buildReportShape>>) {
  console.log("# Co-Build operations report");
  console.log(`\nGenerated: ${report.generatedAt}`);
  console.log(`\n- App mode: ${report.appMode}`);
  console.log(`- Active recurring subscriptions: ${report.activeRecurringSubscriptions}`);
  console.log(`- Active bookings: ${report.bookings.active}`);
  console.log(`- Bookings created in 30 days: ${report.bookings.createdLast30Days}`);
  console.log(`- Upload bytes recorded: ${report.uploads.totalBytesRecorded}`);
  console.log(`- Stale pending uploads: ${report.uploads.stalePendingOlderThanOneHour}`);
  console.log(`- Private storage configured: ${report.uploads.privateStorageConfigured}`);
  console.log(`- Database provider: ${report.database.provider}`);
  console.log(`- Pooled endpoint detected: ${report.database.pooledEndpointDetected}`);
  console.log("\n## Warnings");
  if (!report.warnings.length) console.log("\nNo automated threshold warning was triggered.");
  else report.warnings.forEach((warning) => console.log(`\n- ${warning}`));
}

function buildReportShape() {
  return Promise.resolve({} as {
    generatedAt: string; appMode: string; activeRecurringSubscriptions: number;
    bookings: { active: number; createdLast30Days: number };
    uploads: { totalBytesRecorded: number; stalePendingOlderThanOneHour: number; privateStorageConfigured: boolean };
    database: { provider: string; pooledEndpointDetected: boolean };
    warnings: string[];
  });
}

main().finally(() => prisma.$disconnect());
