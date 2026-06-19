import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      companyName: true,
      createdAt: true,
      email: true,
      fullName: true,
      id: true,
      platformSubscriptionNextBilling: true,
      platformSubscriptionStatus: true,
      role: true,
      suspended: true,
      uen: true,
      verificationStatus: true
    }
  });

  const csv = toCsv(users, [
    { key: "id", header: "User ID" },
    { key: "role", header: "Role" },
    { key: "fullName", header: "Full name" },
    { key: "email", header: "Email" },
    { key: "companyName", header: "Company" },
    { key: "uen", header: "UEN" },
    { key: "verificationStatus", header: "Verification" },
    { key: "platformSubscriptionStatus", header: "Subscription" },
    { key: "platformSubscriptionNextBilling", header: "Next billing" },
    { key: "suspended", header: "Suspended" },
    { key: "createdAt", header: "Created" }
  ]);

  return csvResponse("co-build-users.csv", csv);
}
