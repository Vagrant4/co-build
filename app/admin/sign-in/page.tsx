import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { claimInitialAdminAction } from "@/app/admin/sign-in/actions";
import { Logo } from "@/components/logo";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";
import { AdminAuthPanel } from "./admin-auth-panel";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  if (getAppMode() === "demo") redirect("/demo");
  const session = await auth();
  const mapped = session.userId ? await prisma.user.findUnique({ where: { authProviderId: `clerk:${session.userId}` } }) : null;
  if (mapped?.role === "ADMIN" && !mapped.suspended) redirect("/dashboard/admin");

  const identity = session.userId ? await currentUser() : null;
  const email = identity?.primaryEmailAddress?.emailAddress.toLowerCase();
  const pendingAdmin = email
    ? await prisma.user.findFirst({ where: { email, role: "ADMIN", authProviderId: null, suspended: false }, select: { email: true } })
    : null;

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-page__identity">
        <Logo variant="full" className="text-white" accentClassName="text-hazard" />
        <div>
          <p className="admin-auth-page__label"><ShieldCheck size={15} /> Restricted operations access</p>
          <h1>Administrator portal</h1>
          <p>Review hosts, renters, listings, payments, safety matters, subscriptions, and platform activity from a separate protected console.</p>
        </div>
        <dl>
          <div><dt>Authentication</dt><dd>Managed by Clerk</dd></div>
          <div><dt>Authorization</dt><dd>Administrator role required</dd></div>
          <div><dt>Audit</dt><dd>Sensitive actions recorded</dd></div>
        </dl>
      </section>

      <section className="admin-auth-page__panel">
        <div className="admin-auth-page__panel-shell">
        <header className="admin-auth-page__panel-header">
          <p className="admin-auth-page__label">Private administrator entry</p>
          <h2>Access the operations console</h2>
          <p>Use the pre-authorized administrator identity. Renter and host accounts are rejected.</p>
        </header>
        {pendingAdmin ? (
          <div className="admin-auth-page__message">
            <p className="admin-auth-page__label">Identity verified</p>
            <h2>Activate administrator access</h2>
            <p>Link this verified Clerk identity to the authorized SpaceOnCall administrator record. This one-time action is audited.</p>
            <form action={claimInitialAdminAction}>
              <button className="admin-auth-page__button" type="submit"><ShieldCheck size={18} /> Activate admin console</button>
            </form>
          </div>
        ) : (
          <AdminAuthPanel signedIn={Boolean(session.userId)} />
        )}
        </div>
      </section>
    </main>
  );
}
