import Link from "next/link";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { acceptBookingAgreementAction } from "@/app/actions";
import { requireBookingParticipant } from "@/src/lib/authorization";
import { bookingDocumentDigest } from "@/src/lib/agreement-acceptance";
import { loadBookingDocument } from "@/src/lib/booking-document";
import { LEGAL_DOCUMENT_REVIEW_STATUS, LEGAL_DOCUMENT_VERSION } from "@/src/lib/legal-documents";

type PageProps = { params: Promise<{ bookingId: string }> };

export const dynamic = "force-dynamic";

export default async function BookingAgreementPage({ params }: PageProps) {
  const { bookingId } = await params;
  const actor = await requireBookingParticipant(bookingId);
  const record = await loadBookingDocument(bookingId);
  if (!record) notFound();
  const returnUrl = actor.role === "ADMIN" ? "/dashboard/admin" : actor.role === "HOST" ? "/dashboard/host" : "/dashboard/user";
  const blocks = record.body.split("\n\n");
  const documentHash = bookingDocumentDigest(record.body);
  const renterAcceptance = record.booking.agreementAcceptances.find((item) => item.userId === record.booking.userId && item.documentHash === documentHash);
  const hostAcceptance = record.booking.listing.hostId
    ? record.booking.agreementAcceptances.find((item) => item.userId === record.booking.listing.hostId && item.documentHash === documentHash)
    : null;
  const actorAccepted = record.booking.agreementAcceptances.some((item) => item.userId === actor.id && item.documentHash === documentHash);

  return (
    <main className="bg-smoke py-8 sm:py-12">
      <div className="section-shell grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="border border-neutral-300 bg-white">
          <header className="border-b border-neutral-300 p-6 sm:p-8">
            <Link className="inline-flex items-center gap-2 text-sm font-black text-steel hover:text-ink" href={returnUrl}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
            </Link>
            <p className="eyebrow mt-8">Private participant document</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Renter-Host Booking Agreement</h1>
            <p className="mt-3 font-bold text-steel">{record.booking.listing.title}</p>
          </header>
          <div className="divide-y divide-neutral-200">
            {blocks.map((block, index) => {
              const [heading, ...lines] = block.split("\n");
              return (
                <section key={`${heading}-${index}`} className="grid gap-3 p-6 sm:grid-cols-[52px_1fr] sm:p-8">
                  <span className="font-mono text-sm font-black text-hazard">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="text-lg font-black">{heading}</h2>
                    <div className="mt-3 space-y-2">
                      {lines.map((line) => <p key={line} className="font-medium leading-6 text-steel">{line}</p>)}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-neutral-300 bg-white p-5">
            <div className="flex items-center gap-2 text-hazard">
              <ShieldAlert size={20} aria-hidden="true" />
              <p className="text-xs font-black uppercase">{LEGAL_DOCUMENT_REVIEW_STATUS}</p>
            </div>
            <p className="mt-3 text-sm font-bold text-steel">
              This space agreement is between the renter and host. SpaceOnCall prepares the record for their review and acknowledgement and is not a party to their space booking.
            </p>
            <p className="mt-4 text-xs font-black uppercase text-steel">Version {LEGAL_DOCUMENT_VERSION}</p>
            <p className="mt-2 break-all font-mono text-[11px] font-bold text-steel">SHA-256 {documentHash}</p>
            <div className="mt-5 grid gap-2 text-sm font-bold">
              <p className={renterAcceptance ? "text-emerald-700" : "text-steel"}>Renter: {renterAcceptance ? "Accepted" : "Pending"}</p>
              <p className={hostAcceptance ? "text-emerald-700" : "text-steel"}>Host: {hostAcceptance ? "Accepted" : "Pending"}</p>
            </div>
            {actor.role !== "ADMIN" && !actorAccepted ? (
              <form action={acceptBookingAgreementAction} className="mt-5">
                <input type="hidden" name="bookingId" value={bookingId} />
                <label className="flex items-start gap-2 text-sm font-bold text-steel">
                  <input className="mt-1" type="checkbox" required />
                  <span>I have reviewed and accept this exact agreement record.</span>
                </label>
                <button className="button-dark mt-3 w-full" type="submit">Accept agreement</button>
              </form>
            ) : actor.role !== "ADMIN" ? (
              <p className="mt-5 border border-emerald-700 bg-emerald-50 p-3 text-sm font-black text-emerald-800">Your acceptance is recorded.</p>
            ) : null}
            <a className="button-primary mt-5 w-full" href={`/api/bookings/${bookingId}/documents/booking-summary`}>
              <Download size={18} aria-hidden="true" /> Download PDF
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
