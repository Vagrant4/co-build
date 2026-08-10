import Link from "next/link";
import { ArrowRight, Download, FileCheck2, ShieldCheck } from "lucide-react";
import { LEGAL_DOCUMENT_REVIEW_STATUS, LEGAL_DOCUMENT_VERSION, legalDocuments } from "@/src/lib/legal-documents";

export const metadata = {
  title: "Legal Centre | SpaceOnCall",
  description: "SpaceOnCall pilot policies, safety rules, and agreement templates."
};

export default function LegalCentrePage() {
  return (
    <main>
      <section className="border-b border-neutral-300 bg-ink py-12 text-white">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="eyebrow text-safety">Legal and operating documents</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black sm:text-5xl">Pilot Legal Centre</h1>
            <p className="mt-4 max-w-3xl text-lg font-bold text-neutral-300">
              Current operating drafts for renters, hosts, bookings, subscriptions, privacy, and safety.
            </p>
          </div>
          <div className="border-l-4 border-safety bg-neutral-900 p-5">
            <p className="text-xs font-black uppercase text-safety">Document status</p>
            <p className="mt-2 text-lg font-black">{LEGAL_DOCUMENT_REVIEW_STATUS}</p>
            <p className="mt-2 text-sm font-bold text-neutral-300">Version {LEGAL_DOCUMENT_VERSION}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-300 bg-white py-10">
        <div className="section-shell grid gap-5 md:grid-cols-3">
          <StatusItem icon={<FileCheck2 size={22} />} title="Operational drafts" detail="Usable for pilot review and process testing." />
          <StatusItem icon={<ShieldCheck size={22} />} title="Private deal records" detail="Booking PDFs are restricted to the renter, host, and administrator." />
          <StatusItem icon={<Download size={22} />} title="Downloadable" detail="Every published draft has a versioned PDF copy." />
        </div>
      </section>

      <section className="bg-smoke py-12">
        <div className="section-shell">
          <div className="mb-7 max-w-3xl">
            <p className="eyebrow">Document library</p>
            <h2 className="mt-2 text-3xl font-black">Policies and templates</h2>
            <p className="mt-3 font-bold text-steel">
              These drafts are not legal advice and are not signed agreements. Singapore counsel must review them before public launch.
            </p>
          </div>
          <div className="grid gap-px border border-neutral-300 bg-neutral-300 md:grid-cols-2">
            {legalDocuments.map((document, index) => (
              <article key={document.slug} className="group bg-white p-5 transition-colors hover:bg-neutral-50">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-black text-hazard">{String(index + 1).padStart(2, "0")}</span>
                  <span className="border border-neutral-300 px-2 py-1 text-[11px] font-black uppercase text-steel">{document.audience}</span>
                </div>
                <h3 className="mt-5 text-xl font-black">{document.shortTitle}</h3>
                <p className="mt-2 min-h-12 text-sm font-bold text-steel">{document.summary}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link className="button-secondary" href={`/legal/${document.slug}`}>
                    Read <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a className="button-secondary" href={`/legal/documents/${document.slug}`}>
                    <Download size={16} aria-hidden="true" /> PDF
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex gap-3 border-l-2 border-hazard pl-4">
      <span className="mt-0.5 text-hazard">{icon}</span>
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="mt-1 text-sm font-bold text-steel">{detail}</p>
      </div>
    </div>
  );
}
