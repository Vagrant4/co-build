import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  const users = await prisma.$transaction(async (tx) => {
    const rows = await tx.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
      companyName: true,
      createdAt: true,
      id: true,
      platformSubscriptionNextBilling: true,
      platformSubscriptionStatus: true,
      role: true,
      suspended: true,
      verificationStatus: true
      }
    });
    await tx.adminExportEvent.create({ data: { actorId: admin.id, exportType: "users", rowCount: rows.length } });
    return rows;
  });

  const csv = toCsv(users, [
    { key: "id", header: "User ID" },
    { key: "role", header: "Role" },
    { key: "companyName", header: "Company" },
    { key: "verificationStatus", header: "Verification" },
    { key: "platformSubscriptionStatus", header: "Subscription" },
    { key: "platformSubscriptionNextBilling", header: "Next billing" },
    { key: "suspended", header: "Suspended" },
    { key: "createdAt", header: "Created" }
  ]);

  return csvResponse("co-build-users.csv", csv);
}
