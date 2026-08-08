import { prisma } from "../src/lib/db";

async function main() {
  if (process.env.APP_MODE !== "pilot" && process.env.APP_MODE !== "production") throw new Error("First-admin bootstrap is allowed only in pilot or production mode.");
  if (process.env.CONFIRM_BOOTSTRAP_ADMIN !== "CREATE_FIRST_CO_BUILD_ADMIN") throw new Error("Set CONFIRM_BOOTSTRAP_ADMIN=CREATE_FIRST_CO_BUILD_ADMIN after verifying the Clerk user id and email.");
  const clerkUserId = required("BOOTSTRAP_ADMIN_CLERK_USER_ID");
  const email = required("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const fullName = required("BOOTSTRAP_ADMIN_FULL_NAME");
  const existingAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existingAdmins) throw new Error("An administrator already exists. Use authenticated admin controls for subsequent role management.");
  const existingIdentity = await prisma.user.findFirst({ where: { OR: [{ authProviderId: `clerk:${clerkUserId}` }, { email }] } });
  if (existingIdentity) throw new Error("The Clerk identity or email is already mapped to an account.");
  const id = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.user.create({ data: { id, authProviderId: `clerk:${clerkUserId}`, role: "ADMIN", fullName, mobile: "", email, companyName: "Co-Build", verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } });
    await tx.approvalEvent.create({ data: { actorId: id, target: "first_admin_bootstrap", decision: "APPROVED", note: "First administrator was created through the guarded one-time bootstrap procedure." } });
  });
  console.log(JSON.stringify({ created: true, adminId: id, authProvider: "clerk" }, null, 2));
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

main().finally(() => prisma.$disconnect());
