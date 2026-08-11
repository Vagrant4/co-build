"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";

export async function claimInitialAdminAction() {
  if (getAppMode() === "demo") throw new Error("Administrator identity claiming is disabled in demo mode.");
  const session = await auth();
  if (!session.userId) throw new Error("Administrator sign-in is required.");
  const identity = await currentUser();
  const primaryEmail = identity?.primaryEmailAddress;
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") throw new Error("A verified primary email is required.");
  const email = primaryEmail.emailAddress.trim().toLowerCase();
  const authProviderId = `clerk:${session.userId}`;

  await prisma.$transaction(async (tx) => {
    const existingIdentity = await tx.user.findUnique({ where: { authProviderId }, select: { id: true } });
    if (existingIdentity) throw new Error("This identity is already linked to a marketplace account.");
    const admin = await tx.user.findFirst({ where: { email, role: "ADMIN", authProviderId: null, suspended: false }, select: { id: true } });
    if (!admin) throw new Error("This email is not authorized for administrator access.");
    await tx.user.update({ where: { id: admin.id }, data: { authProviderId, verificationStatus: "APPROVED" } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, target: "initial_admin_identity_claim", decision: "APPROVED", note: "Verified Clerk identity linked through the one-time administrator portal." } });
  });
  redirect("/dashboard/admin");
}
