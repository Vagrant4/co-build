import { Camera, ClipboardPlus, CreditCard, FileCheck2, FileText } from "lucide-react";
import {
  confirmDealAction,
  confirmAdditionalRequirementPaymentAction,
  confirmPaymentAction,
  createAdditionalRequirementAction,
  submitPlatformSubscriptionPaymentAction,
  uploadBookingPhotoAction
} from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { dealConfirmationStatus, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const [user, bookings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: "demo-renter" } }),
    prisma.booking.findMany({
      where: { userId: "demo-renter" },
      include: {
        listing: true,
        addons: { include: { equipmentAddon: true } },
        uploads: true,
        additionalRequirements: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <main className="section-shell py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-hazard">Demo renter</p>
        <h1 className="text-4xl font-black">User dashboard</h1>
        <p className="mt-2 font-bold text-steel">Track approvals, Stripe-admin payment status, and check-in/check-out photo uploads.</p>
      </div>
      <PlatformSubscriptionPanel
        title="Renter platform subscription"
        userId={user.id}
        email={user.email}
        status={user.platformSubscriptionStatus}
        reference={user.platformSubscriptionReference}
        nextBillingAt={user.platformSubscriptionNextBilling}
        periodEndAt={user.platformSubscriptionPeriodEnd}
        labelPrefix="Renter"
      />
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
                <form action={confirmPaymentAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button className="button-primary w-full" type="submit">
                    <CreditCard size={18} /> Pay with Stripe
                  </button>
                </form>
              )}
              <DealConfirmationForm bookingId={booking.id} confirmed={Boolean(booking.renterDealConfirmedAt)} role="RENTER" label="Confirm deal as renter" />
              <AdditionalRequirementForm bookingId={booking.id} />
              <PhotoForm bookingId={booking.id} type="CHECK_IN" label="Upload check-in photos" />
              <PhotoForm bookingId={booking.id} type="CHECK_OUT" label="Upload check-out photos" />
            </aside>
          </section>
        ))}
      </div>
    </main>
  );
}

function PlatformSubscriptionPanel({
  title,
  userId,
  email,
  status,
  reference,
  nextBillingAt,
  periodEndAt,
  labelPrefix
}: {
  title: string;
  userId: string;
  email: string;
  status: string;
  reference: string | null;
  nextBillingAt: Date | null;
  periodEndAt: Date | null;
  labelPrefix: string;
}) {
  const nextRenewal = nextBillingAt ?? periodEndAt;

  return (
    <section className="card mb-6 grid gap-4 p-5 premium-panel lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <span className="status-pill">{formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month</span>
          <span className="status-pill">Stripe recurring plan</span>
        </div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-2 font-bold text-steel">
          User and host each pay admin {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month for platform access through Stripe.
          Stripe handles recurring renewal, deals are confirmed on-platform, and admin charges no commission on confirmed deals.
        </p>
        <p className="mt-2 text-sm font-black">
          Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after admin activates your recurring subscription"}
        </p>
        <p className="mt-2 text-sm font-black">Stripe account email: {email}</p>
        {reference && <p className="mt-2 text-sm font-bold text-steel">Latest Stripe session: {reference}</p>}
      </div>
      <form action={submitPlatformSubscriptionPaymentAction} className="stripe-card grid content-between gap-3 border border-neutral-200 bg-white p-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="stripeCheckoutReference" value={`stripe_checkout_${labelPrefix.toLowerCase()}_${userId}`} />
        <div>
          <p className="label">{labelPrefix} Stripe checkout</p>
          <p className="text-sm font-bold text-steel">Open a hosted checkout for the recurring S$5/month subscription. Admin activates after Stripe confirmation.</p>
        </div>
        <button className="button-primary" type="submit">
          Start Stripe checkout
        </button>
      </form>
    </section>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

type AdditionalRequirementView = {
  id: string;
  detail: string;
  status: string;
  quotedRate: number;
  contractText: string | null;
  emailedTo: string | null;
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
              {request.contractText && (
                <details className="mt-3" open>
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-black uppercase text-hazard">
                    <FileText size={16} aria-hidden="true" />
                    Generated contract
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap border border-neutral-200 bg-smoke p-3 text-xs font-bold text-steel">
                    {request.contractText}
                  </pre>
                </details>
              )}
              {request.emailedTo && <p className="mt-2 text-sm font-black">Contract emailed to {request.emailedTo}</p>}
              {request.status === "APPROVED_FOR_PAYMENT" && (
                <form action={confirmAdditionalRequirementPaymentAction} className="mt-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button className="button-primary" type="submit">
                    <CreditCard size={18} /> Pay add-on with Stripe {formatCurrency(request.quotedRate)}
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

function DealConfirmationForm({ bookingId, role, label, confirmed }: { bookingId: string; role: "RENTER" | "HOST"; label: string; confirmed: boolean }) {
  return confirmed ? (
    <div className="border border-neutral-200 bg-white p-3 text-sm font-black text-steel">Deal confirmed on platform.</div>
  ) : (
    <form action={confirmDealAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="role" value={role} />
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
      <label>
        <span className="label">{label}</span>
        <input name="photo" type="file" accept="image/*" />
      </label>
      <button className="button-secondary" type="submit">
        <Camera size={18} /> Upload
      </button>
    </form>
  );
}
