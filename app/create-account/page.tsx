import { BriefcaseBusiness, UserRound } from "lucide-react";
import { createAccountAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { PLATFORM_SUBSCRIPTION_MONTHLY, formatCurrency } from "@/src/lib/fabrication";
import { workTypes } from "@/src/lib/seed-data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function CreateAccountPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const role = one(params.role) === "host" ? "HOST" : "RENTER";
  const isHost = role === "HOST";

  return (
    <main className="section-shell py-10">
      <div className="mb-8 flex max-w-3xl flex-col items-center text-center md:items-start md:text-left">
        <Logo
          variant="full"
          className="mb-6"
          iconClassName="h-12 w-12 sm:h-14 sm:w-14"
          wordmarkClassName="text-3xl sm:text-4xl"
        />
        <p className="text-sm font-black uppercase text-hazard">Account setup</p>
        <h1 className="mt-2 text-4xl font-black">Create account</h1>
        <p className="mt-3 max-w-3xl font-bold text-steel">
          Create a renter or host account, then activate the recurring {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month platform subscription through admin-managed Stripe checkout.
        </p>
      </div>

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

      <section className="card grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
        <form action={createAccountAction} className="grid gap-4">
          <input type="hidden" name="role" value={role} />
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Full name</span>
              <input className="field" name="fullName" autoComplete="name" required />
            </label>
            <label>
              <span className="label">Mobile</span>
              <input className="field" name="mobile" autoComplete="tel" required />
            </label>
            <label>
              <span className="label">Email</span>
              <input className="field" name="email" type="email" autoComplete="email" required />
            </label>
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

        <aside className="border border-neutral-300 bg-smoke p-4">
          <p className="text-sm font-black uppercase text-hazard">{isHost ? "Host account" : "Renter account"}</p>
          <h2 className="mt-2 text-2xl font-black">{isHost ? "List spaces after admin review" : "Book spaces after verification"}</h2>
          <div className="mt-4 grid gap-3 text-sm font-bold text-steel">
            <p>Verification starts as pending.</p>
            <p>Subscription starts unpaid until Stripe checkout is submitted.</p>
            <p>Recurring renewal is collected by admin through Stripe.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
