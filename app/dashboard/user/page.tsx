import { Camera, ClipboardPlus, CreditCard, Download, FileCheck2, FileText } from "lucide-react";
import {
  confirmDealAction,
  confirmAdditionalRequirementPaymentAction,
  confirmPaymentAction,
  createAdditionalRequirementAction,
  uploadBookingPhotoAction
} from "@/app/actions";
import { PrivateUploadField } from "@/components/private-upload-field";
import { BookingChat } from "@/components/booking-chat";
import { StatusBadge } from "@/components/status-badge";
import { NotificationCenter } from "@/components/notification-center";
import { PlatformSubscriptionPanel } from "@/components/platform-subscription-panel";
import { dealConfirmationStatus, formatCurrency } from "@/src/lib/fabrication";
import { prisma } from "@/src/lib/db";
import { requirePageRole } from "@/src/lib/page-authorization";
import { getAppMode } from "@/src/lib/app-mode";
import { isStripeBillingConfigured } from "@/src/lib/stripe-billing";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const user = await requirePageRole("RENTER");
  const [bookings, notifications] = await Promise.all([prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        listing: true,
        addons: { include: { equipmentAddon: true } },
        uploads: true,
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
        additionalRequirements: { orderBy: { createdAt: "desc" } },
        paymentRecords: { orderBy: { submittedAt: "desc" } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }), prisma.notification.findMany({ where: { userId: user.id, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 20 })]);
  const realPaymentProofRequired = getAppMode() !== "demo";
  const accountLabel = getAppMode() === "demo" ? "Demo renter" : "Renter account";

  return (
    <main className="section-shell py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-hazard">{accountLabel}</p>
        <h1 className="text-4xl font-black">User dashboard</h1>
        <p className="mt-2 font-bold text-steel">Track approvals, subscription status, and check-in/check-out photo uploads.</p>
      </div>
      <PlatformSubscriptionPanel
        title="Renter platform subscription"
        email={user.email}
        status={user.platformSubscriptionStatus}
        provider={user.platformSubscriptionProvider}
        reference={user.platformSubscriptionReference}
        nextBillingAt={user.platformSubscriptionNextBilling}
        periodEndAt={user.platformSubscriptionPeriodEnd}
        stripeAvailable={isStripeBillingConfigured()}
        stripeCustomerId={user.stripeCustomerId}
      />
      <NotificationCenter notifications={notifications} />
      <div className="grid gap-5">
        {bookings.map((booking) => (
          <section key={booking.id} className="card grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={booking.status} />
                <StatusBadge status={booking.riskLevel} />
                <StatusBadge status={dealConfirmationStatus(booking.renterDealConfirmedAt, booking.hostDealConfirmedAt)} />
              </div>
              <h2 className="text-2xl font-black">{booking.listing.title}</h2>
              <p className="font-bold text-steel">{booking.listing.address}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Metric label="Duration" value={`${booking.durationDays} days`} />
                <Metric label="Start" value={booking.startAt ? formatDate(booking.startAt) : "Not recorded"} />
                <Metric label="Work" value={booking.workType} />
                <Metric label="Deposit" value={formatCurrency(booking.deposit)} />
                <Metric label="Total" value={formatCurrency(booking.grandTotal)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.addons.map((addon) => (
                  <span key={addon.equipmentAddon.slug} className="border border-neutral-300 px-3 py-2 text-sm font-bold">
                    {addon.equipmentAddon.name}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-sm font-black uppercase text-steel">Uploaded files</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {booking.uploads.length ? (
                    booking.uploads.map((upload) => (
                      <span key={upload.id} className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-sm font-bold">
                        <FileCheck2 size={16} className="text-hazard" /> {upload.type.replaceAll("_", " ")}: {upload.originalName}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-bold text-steel">No uploads yet.</span>
                  )}
                </div>
              </div>
              <AdditionalRequirementList requests={booking.additionalRequirements} />
            </div>
            <aside className="space-y-4 border border-neutral-300 bg-smoke p-4">
              {booking.status === "APPROVED_FOR_PAYMENT" && (
                <form action={confirmPaymentAction} className="grid gap-3 border border-neutral-300 bg-white p-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <label>
                    <span className="label">Company-account payment reference</span>
                    <input className="field" name="paymentReference" placeholder="PayNow or bank reference" required />
                  </label>
                  <PrivateUploadField label={`Payment proof${realPaymentProofRequired ? "" : " (optional in demo)"}`} name="paymentProof" type="PAYMENT_EVIDENCE" bookingId={booking.id} accept="image/jpeg,image/png,application/pdf" required={realPaymentProofRequired} />
                  <button className="button-primary w-full" type="submit">
                    <CreditCard size={18} /> Submit payment for verification
                  </button>
                </form>
              )}
              {booking.status === "PAYMENT_SUBMITTED" && <p className="border border-amber-400 bg-amber-50 p-3 text-sm font-black text-amber-900">Payment proof submitted. Booking remains unpaid until admin verifies the company account.</p>}
              <a className="button-secondary w-full" href={`/dashboard/bookings/${booking.id}/agreement`}>
                <FileText size={18} aria-hidden="true" /> View booking agreement
              </a>
              <a className="button-secondary w-full" href={`/api/bookings/${booking.id}/documents/booking-summary`}><Download size={18} aria-hidden="true" /> Download PDF</a>
              <DealConfirmationForm bookingId={booking.id} confirmed={Boolean(booking.renterDealConfirmedAt)} label="Confirm deal as renter" />
              <BookingChat
                bookingId={booking.id}
                messages={booking.messages}
                title="Chat with host"
                currentUserId={user.id}
                placeholder="Ask the host about access, loading, timing, or setup."
              />
              <AdditionalRequirementForm bookingId={booking.id} />
              <PhotoForm bookingId={booking.id} type="CHECK_IN" label="Upload check-in photos" />
              <PhotoForm bookingId={booking.id} type="CHECK_OUT" label="Upload check-out photos" />
            </aside>
          </section>
        ))}
        {!bookings.length && <section className="card p-6"><h2 className="text-2xl font-black">No booking requests yet</h2><p className="mt-2 font-bold text-steel">Search approved spaces and submit your first request when you are ready.</p></section>}
      </div>
    </main>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore"
  }).format(date);
}

type AdditionalRequirementView = {
  id: string;
  detail: string;
  status: string;
  quotedRate: number;
  contractText: string | null;
};

function AdditionalRequirementList({ requests }: { requests: AdditionalRequirementView[] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-black uppercase text-steel">Additional requirements</p>
      <div className="mt-2 grid gap-3">
        {requests.length ? (
          requests.map((request) => (
            <article key={request.id} data-additional-request className="border border-neutral-300 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                {request.quotedRate > 0 && <span className="status-pill">{formatCurrency(request.quotedRate)}</span>}
              </div>
              <p className="mt-2 text-sm font-bold text-steel">{request.detail}</p>
              {request.contractText && <p className="mt-3 flex items-center gap-2 text-sm font-black text-hazard"><FileText size={16} aria-hidden="true" /> Approved add-on included in the booking agreement.</p>}
              {request.contractText && <p className="mt-2 text-sm font-black">Record available in the renter and host dashboards.</p>}
              {request.status === "APPROVED_FOR_PAYMENT" && (
                <form action={confirmAdditionalRequirementPaymentAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input className="field" name="paymentReference" placeholder="PayNow or bank reference" required />
                  <button className="button-primary" type="submit">
                    <CreditCard size={18} /> Submit add-on payment {formatCurrency(request.quotedRate)}
                  </button>
                </form>
              )}
            </article>
          ))
        ) : (
          <span className="text-sm font-bold text-steel">No additional requirements requested.</span>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 bg-white p-3">
      <p className="text-xs font-black uppercase text-steel">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function AdditionalRequirementForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={createAdditionalRequirementAction} className="grid gap-3 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label>
        <span className="label">Additional requirement details</span>
        <textarea
          className="field min-h-28"
          name="additionalDetail"
          placeholder="Describe extra access time, manpower, equipment support, storage, or special setup needed."
          required
        />
      </label>
      <button className="button-secondary" type="submit">
        <ClipboardPlus size={18} /> Submit additional requirement
      </button>
    </form>
  );
}

function DealConfirmationForm({ bookingId, label, confirmed }: { bookingId: string; label: string; confirmed: boolean }) {
  return confirmed ? (
    <div className="border border-neutral-200 bg-white p-3 text-sm font-black text-steel">Deal confirmed on platform.</div>
  ) : (
    <form action={confirmDealAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm font-bold text-steel">Confirm the deal on-platform. Admin does not charge a deal commission.</p>
      <button className="button-secondary" type="submit">
        {label}
      </button>
    </form>
  );
}

function PhotoForm({ bookingId, type, label }: { bookingId: string; type: "CHECK_IN" | "CHECK_OUT"; label: string }) {
  return (
    <form action={uploadBookingPhotoAction} className="grid gap-3 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="uploadKind" value={type} />
      <PrivateUploadField label={label} name="photo" type={type} bookingId={bookingId} accept="image/jpeg,image/png,image/webp" required />
      <button className="button-secondary" type="submit">
        <Camera size={18} /> Upload
      </button>
    </form>
  );
}
