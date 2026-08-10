import Link from "next/link";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { getLegalDocument, legalDocuments } from "@/src/lib/legal-documents";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const document = getLegalDocument((await params).slug);
  return document ? { title: `${document.shortTitle} | SpaceOnCall` } : {};
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const document = getLegalDocument((await params).slug);
  if (!document) notFound();

  return (
    <main className="bg-smoke py-10 sm:py-14">
      <div className="section-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="border border-neutral-300 bg-white">
          <header className="border-b border-neutral-300 p-6 sm:p-8">
            <Link className="inline-flex items-center gap-2 text-sm font-black text-steel hover:text-ink" href="/legal">
              <ArrowLeft size={16} aria-hidden="true" /> Legal Centre
            </Link>
            <p className="eyebrow mt-8">{document.audience}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">{document.title}</h1>
            <p className="mt-4 max-w-3xl font-bold text-steel">{document.summary}</p>
          </header>
          <div className="divide-y divide-neutral-200">
            {document.sections.map((section, index) => (
              <section key={section.heading} className="grid gap-4 p-6 sm:grid-cols-[52px_1fr] sm:p-8">
                <span className="font-mono text-sm font-black text-hazard">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="text-xl font-black">{section.heading}</h2>
                  <div className="mt-3 space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="font-medium leading-7 text-steel">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-neutral-300 bg-white p-5">
            <div className="flex items-center gap-2 text-hazard">
              <ShieldAlert size={20} aria-hidden="true" />
              <p className="text-xs font-black uppercase">Lawyer review required</p>
            </div>
            <p className="mt-3 text-sm font-bold text-steel">
              This pilot template is not legal advice and is not an executed agreement.
            </p>
            <dl className="mt-5 border-y border-neutral-200 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="font-bold text-steel">Version</dt>
                <dd className="font-black">{document.version}</dd>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <dt className="font-bold text-steel">Format</dt>
                <dd className="font-black">PDF</dd>
              </div>
            </dl>
            <a className="button-primary mt-5 w-full" href={`/legal/documents/${document.slug}`}>
              <Download size={18} aria-hidden="true" /> Download PDF
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
