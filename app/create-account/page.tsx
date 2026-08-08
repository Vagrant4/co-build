import { BriefcaseBusiness, UserRound } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAccountAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { PLATFORM_SUBSCRIPTION_MONTHLY, formatCurrency } from "@/src/lib/fabrication";
import { workTypes } from "@/src/lib/seed-data";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function CreateAccountPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const role = one(params.role) === "host" ? "HOST" : "RENTER";
  const isHost = role === "HOST";
  const mode = getAppMode();
  let managedEmail: string | null = null;
  if (mode !== "demo") {
    const session = await auth();
    if (!session.userId) redirect(`/sign-up?redirect_url=${encodeURIComponent(`/create-account?role=${isHost ? "host" : "renter"}`)}`);
    const existing = await prisma.user.findUnique({ where: { authProviderId: `clerk:${session.userId}` } });
    if (existing) redirect(existing.role === "HOST" ? "/dashboard/host" : existing.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/user");
    const identity = await currentUser();
    managedEmail = identity?.emailAddresses.find((item) => item.id === identity.primaryEmailAddressId)?.emailAddress ?? null;
  }

  return (
    <main className="signal-page">
      <section className="page-hero page-hero--compact">
        <div className="section-shell">
          <Logo
            variant="full"
            className="dark-hero-logo mb-6 text-white"
            accentClassName="text-safety"
            iconClassName="h-12 w-12 sm:h-14 sm:w-14"
            wordmarkClassName="text-3xl sm:text-4xl"
          />
          <p className="text-sm font-black uppercase text-safety">Account setup</p>
          <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">Create account</h1>
          <p className="mt-3 max-w-3xl font-bold text-neutral-300">
            Create a renter or host account, then activate the recurring {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month platform subscription with a company-account payment reference.
          </p>
        </div>
      </section>

      <section className="section-shell pt-8 pb-12">
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Account type">
          <a
            href="/create-account?role=renter"
            role="tab"
            aria-selected={!isHost}
            className={!isHost ? "button-primary" : "button-secondary"}
          >
            <UserRound size={18} aria-hidden="true" />
            Renter account
          </a>
          <a
            href="/create-account?role=host"
            role="tab"
            aria-selected={isHost}
            className={isHost ? "button-primary" : "button-secondary"}
          >
            <BriefcaseBusiness size={18} aria-hidden="true" />
            Host account
          </a>
        </div>

        <section className="card co-build-form grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
          <form action={createAccountAction} className="grid gap-4">
            <input type="hidden" name="role" value={role} />
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Full name</span>
                <input className="field" name="fullName" autoComplete="name" required />
              </label>
              {mode === "demo" ? (
                <label>
                  <span className="label">Demo login email</span>
                  <input className="field" name="email" type="email" autoComplete="email" required />
                </label>
              ) : (
                <div className="border border-neutral-300 bg-smoke p-3">
                  <span className="label">Managed sign-in email</span>
                  <p className="font-black">{managedEmail ?? "Verified Clerk account"}</p>
                </div>
              )}
              <label>
                <span className="label">Company name</span>
                <input className="field" name="companyName" autoComplete="organization" required />
              </label>
              <label>
                <span className="label">UEN optional</span>
                <input className="field" name="uen" placeholder="Optional" />
              </label>
            </div>

            <label>
              <span className="label">Work type</span>
              <input className="field" name="workType" list="work-type-options" placeholder={isHost ? "Workspace operations / fabrication hosting" : "Assembly, packing, fabrication..."} required />
              <datalist id="work-type-options">
                {workTypes.map((workType) => (
                  <option key={workType} value={workType} />
                ))}
              </datalist>
            </label>

            <button className="button-primary justify-self-start" type="submit">
              <UserRound size={18} aria-hidden="true" />
              Create account
            </button>
          </form>

          <aside className="signup-aside">
            <p className="text-sm font-black uppercase text-hazard">{isHost ? "Host account" : "Renter account"}</p>
            <h2 className="mt-2 text-2xl font-black">{isHost ? "List spaces after admin review" : "Book spaces after verification"}</h2>
            <div className="mt-4 grid gap-3 text-sm font-bold text-steel">
              <p>Verification starts as pending.</p>
              <p>Subscription starts unpaid until payment reference is submitted.</p>
              <p>Recurring renewal is checked by admin through the company account.</p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
