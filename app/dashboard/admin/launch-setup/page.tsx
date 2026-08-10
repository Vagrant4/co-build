import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Database, ExternalLink, FileCheck2, KeyRound, Mail, ShieldCheck, Siren, Users } from "lucide-react";
import { requirePageRole } from "@/src/lib/page-authorization";

export const dynamic = "force-dynamic";

const setupSteps = [
  {
    number: "01",
    title: "Secure the Vercel owner account",
    detail: "Enable an authenticator app. Keep recovery codes offline and do not paste them into Co-Build or Codex.",
    input: "Authenticator app and recovery-code storage",
    href: "https://vercel.com/account/settings/security",
    label: "Open Vercel security",
    icon: ShieldCheck
  },
  {
    number: "02",
    title: "Create the Clerk pilot application",
    detail: "Create the production identity project, verify the sign-in email flow, and restrict pilot registration to invited users.",
    input: "Clerk publishable key and secret key",
    href: "https://dashboard.clerk.com/",
    label: "Open Clerk dashboard",
    icon: KeyRound
  },
  {
    number: "03",
    title: "Review Neon database operations",
    detail: "Confirm the production branch, pooled runtime connection, direct migration connection, backups, and a disposable restore-drill database.",
    input: "Backup owner and completed restore-drill date",
    href: "https://console.neon.tech/",
    label: "Open Neon console",
    icon: Database
  },
  {
    number: "04",
    title: "Verify the email sender",
    detail: "Add the sending domain, publish the DNS records, create a restricted API key, and test delivery and bounce handling.",
    input: "Resend API key and verified From address",
    href: "https://resend.com/domains",
    label: "Open Resend domains",
    icon: Mail
  },
  {
    number: "05",
    title: "Connect error and uptime monitoring",
    detail: "Create owner-accessible alerts for server errors, failed maintenance jobs, upload failures, and public-site downtime.",
    input: "Monitoring project URL, alert webhook, and uptime URL",
    href: "https://sentry.io/signup/",
    label: "Open Sentry setup",
    icon: Siren
  },
  {
    number: "06",
    title: "Enter verified company and payment details",
    detail: "Use the legal company name, UEN, company bank name, account reference format, refund authority, and support contacts.",
    input: "Company, bank, DPO, support, security, operations, and backup contacts",
    href: "https://vercel.com/vagrantecommerce-6355s-projects/co-build/settings/environment-variables",
    label: "Open Co-Build variables",
    icon: Building2
  },
  {
    number: "07",
    title: "Acknowledge pilot legal draft status",
    detail: "The invite-only pilot may use clearly labelled, unreviewed draft documents after owner acknowledgement. Public production still requires Singapore legal review.",
    input: "Owner acknowledgement for the pilot draft exception",
    href: "/legal",
    label: "Review legal documents",
    icon: FileCheck2
  },
  {
    number: "08",
    title: "Approve the invite-only pilot",
    detail: "Name the admin, privacy, security, operations, backup, and support owners; approve the first host and renter list; then rehearse one complete booking.",
    input: "Named owners and approved pilot participant list",
    href: "/dashboard/admin",
    label: "Return to admin controls",
    icon: Users
  }
] as const;

export default async function LaunchSetupPage() {
  await requirePageRole("ADMIN");

  return (
    <main className="section-shell py-8">
      <Link className="inline-flex items-center gap-2 text-sm font-black text-steel hover:text-ink" href="/dashboard/admin">
        <ArrowLeft size={17} aria-hidden="true" /> Admin dashboard
      </Link>

      <header className="mt-5 border-b-4 border-hazard pb-6">
        <p className="text-sm font-black uppercase text-hazard">Owner action required</p>
        <h1 className="mt-2 text-4xl font-black">Manual launch setup</h1>
        <p className="mt-3 max-w-4xl font-bold text-steel">
          These steps need verified owner information or approval. Open each provider from here, complete the stated input, and never paste passwords, recovery codes, bank login details, or one-time codes into Co-Build.
        </p>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        {setupSteps.map(({ number, title, detail, input, href, label, icon: Icon }) => (
          <article className="border border-neutral-300 bg-white p-5" key={number}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center bg-ink font-black text-hazard">{number}</span>
                <div>
                  <Icon className="mb-2 text-hazard" size={22} aria-hidden="true" />
                  <h2 className="text-xl font-black">{title}</h2>
                </div>
              </div>
              <CheckCircle2 className="shrink-0 text-neutral-300" size={22} aria-label="Pending" />
            </div>
            <p className="mt-4 text-sm font-bold text-steel">{detail}</p>
            <div className="mt-4 border-l-4 border-hazard bg-smoke p-3">
              <p className="text-xs font-black uppercase text-steel">You must provide</p>
              <p className="mt-1 font-black">{input}</p>
            </div>
            <Link className="button-secondary mt-4 w-full justify-center" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
              {label} <ExternalLink size={17} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-6 border border-neutral-300 bg-ink p-5 text-white">
        <h2 className="text-xl font-black text-hazard">Pilot is not public production</h2>
        <p className="mt-2 max-w-4xl font-bold text-neutral-200">
          Complete all eight pilot steps, apply migrations, and pass a real host-renter-admin rehearsal. Legal documents remain unreviewed drafts until Singapore counsel approves them for public production.
        </p>
      </section>
    </main>
  );
}
