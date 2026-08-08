import { redirect } from "next/navigation";
import { DemoAccountSelector } from "@/components/demo-account-selector";
import { isDemoMode } from "@/src/lib/app-mode";
import { getOptionalUser } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export default async function DemoLoginPage() {
  if (!isDemoMode()) redirect("/sign-in");
  const [accounts, current] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { fullName: "asc" }] }),
    getOptionalUser()
  ]);

  return (
    <main className="section-shell py-10">
      <p className="text-sm font-black uppercase text-hazard">Demo identity</p>
      <h1 className="mt-2 text-4xl font-black">Choose a showcase account</h1>
      <p className="mt-2 max-w-2xl font-bold text-steel">The selected account is stored in an HTTP-only demo session cookie. This switch is disabled in pilot and production modes.</p>
      {accounts.length ? (
        <DemoAccountSelector accounts={accounts} currentAccountId={current?.id ?? ""} hrefBase="/" label="Available demo accounts" />
      ) : (
        <section className="card mt-6 p-6"><h2 className="text-2xl font-black">No demo accounts</h2><p className="mt-2 font-bold text-steel">Run the explicit demo seed command to create showcase identities.</p></section>
      )}
    </main>
  );
}
