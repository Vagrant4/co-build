import Link from "next/link";
import { Activity, BarChart3, Bell, BookOpenCheck, Building2, CheckCircle2, ClipboardCheck, CreditCard, DollarSign, Download, ExternalLink, LayoutDashboard, ListChecks, ShieldAlert, SlidersHorizontal, UserRound, Users, UserX, XCircle } from "lucide-react";
import {
  approvePlatformSubscriptionAction,
  executeAccountDeletionAction,
  resolvePrivacyRequestAction,
  reviewAdditionalRequirementPaymentAction,
  reviewBookingPaymentAction,
  reviewModerationReportAction,
  toggleUserSuspensionAction,
  updateBookingStatusAction,
  updateDepositStatusAction,
  updateEquipmentPriceAction,
  updateListingPricingAction,
  updateListingStatusAction,
  updateUserVerificationAction
} from "@/app/actions";
import { LaunchReadinessPanel } from "@/components/launch-readiness-panel";
import { StatusBadge } from "@/components/status-badge";
import { NotificationCenter } from "@/components/notification-center";
import { calculatePlatformSubscriptionRevenue, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { getDashboardData } from "@/src/lib/repository";
import { requirePageRole } from "@/src/lib/page-authorization";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ page?: string; approvalError?: string; listingUpdate?: string }> | { page?: string; approvalError?: string; listingUpdate?: string };
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const admin = await requirePageRole("ADMIN");
  const params = (await searchParams) ?? {};
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [{ users, listings, bookings, uploads, approvalEvents, equipment, payments, privacyRequests, moderationReports, pagination, totals }, notifications] = await Promise.all([
    getDashboardData({ page }),
    prisma.notification.findMany({ where: { userId: admin.id, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const subscriptionUsers = users.filter((user) => user.role === "RENTER" || user.role === "HOST");
  const activeSubscriptionCount = totals.activeSubscriptionCount;
  const subscriptionRevenue = calculatePlatformSubscriptionRevenue(activeSubscriptionCount);
  const occupancy = totals.listingCount ? Math.round((totals.occupiedBookingCount / totals.listingCount) * 100) : 0;
  const pendingWork = totals.pendingUserCount + totals.pendingListingCount + totals.pendingBookingCount + totals.submittedPaymentCount;

  return (
    <main className="admin-console">
      <aside className="admin-console__sidebar">
        <div className="admin-console__brand"><span className="admin-console__mark">$</span><span>SpaceOnCall</span></div>
        <p className="admin-console__eyebrow">Operations console</p>
        <nav className="admin-console__nav" aria-label="Admin sections">
          <AdminNav href="#overview" icon={LayoutDashboard} label="Overview" />
          <AdminNav href="#approvals" icon={ListChecks} label="Approvals" count={totals.pendingListingCount} />
          <AdminNav href="#accounts" icon={Users} label="Hosts & renters" count={totals.pendingUserCount} />
          <AdminNav href="#payments" icon={CreditCard} label="Payments" count={totals.submittedPaymentCount} />
          <AdminNav href="#safety" icon={ShieldAlert} label="Safety & bookings" count={totals.pendingBookingCount} />
          <AdminNav href="#activity" icon={Activity} label="Activity log" />
        </nav>
        <div className="admin-console__utility">
          <Link href="/dashboard/admin/launch-setup"><ClipboardCheck size={17} /> Launch setup</Link>
          <Link href="/dashboard/admin/export"><Download size={17} /> Export centre</Link>
          <a href="https://vercel.com/vagrantecommerce-6355s-projects/co-build/analytics" target="_blank" rel="noreferrer"><BarChart3 size={17} /> Traffic analytics</a>
        </div>
      </aside>

      <div className="admin-console__content">
      <header className="admin-console__topbar" id="overview">
        <div>
          <p className="admin-console__eyebrow">{getAppMode() === "demo" ? "Demo operations" : "Live operations"}</p>
          <h1>Overview</h1>
        </div>
        <div className="admin-console__admin-id">
          <Bell size={18} aria-hidden="true" />
          <span>{admin.email}</span>
        </div>
      </header>

      {params.approvalError === "host-ineligible" ? (
        <div className="admin-console__action-message admin-console__action-message--error" role="alert">
          <ShieldAlert size={20} />
          <div><strong>Listing remains pending.</strong><span>Approve the host account, confirm it is not suspended, and activate its subscription before approving the listing.</span></div>
        </div>
      ) : null}
      {params.listingUpdate ? (
        <div className="admin-console__action-message" role="status">
          <CheckCircle2 size={20} />
          <div><strong>Listing updated.</strong><span>The listing is now {params.listingUpdate}.</span></div>
        </div>
      ) : null}

      <section className="admin-console__metrics" aria-label="Platform overview">
        <Metric label="Hosts" value={String(totals.hostCount)} detail={`${totals.newUserCount} new accounts / 7 days`} icon={Building2} />
        <Metric label="Renters" value={String(totals.renterCount)} detail={`${totals.activeSubscriptionCount} active subscribers`} icon={UserRound} />
        <Metric label="Monthly recurring" value={formatCurrency(subscriptionRevenue)} detail={`${formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)} per active account`} icon={DollarSign} />
        <Metric label="Open tasks" value={String(pendingWork)} detail="Requires administrator action" icon={ListChecks} tone="alert" />
      </section>

      <section className="admin-console__pulse" aria-label="Traffic and marketplace activity">
        <div><span>New accounts</span><strong>{totals.newUserCount}</strong><small>last 7 days</small></div>
        <div><span>New listings</span><strong>{totals.newListingCount}</strong><small>last 7 days</small></div>
        <div><span>Booking requests</span><strong>{totals.newBookingCount}</strong><small>last 7 days</small></div>
        <div><span>Occupancy</span><strong>{occupancy}%</strong><small>{totals.bookingCount} total bookings</small></div>
        <a href="https://vercel.com/vagrantecommerce-6355s-projects/co-build/analytics" target="_blank" rel="noreferrer">View visitor traffic <ExternalLink size={15} /></a>
      </section>

      <LaunchReadinessPanel />

      <NotificationCenter notifications={notifications} />

      <DashboardSection id="safety" title="Moderation and policy reports">
        <div className="grid gap-4 lg:grid-cols-2">
          {moderationReports.length ? moderationReports.map((report) => (
            <article key={report.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={report.status} /><StatusBadge status={report.reason} /></div>
              <h3 className="mt-3 font-black">{report.contextType.replaceAll("_", " ")} report</h3>
              <p className="mt-1 text-sm font-bold text-steel">Reported by {report.reporter.fullName}{report.reportedUser ? ` · Account: ${report.reportedUser.fullName}` : ""}</p>
              {report.detail ? <p className="mt-2 text-sm font-bold text-steel">{report.detail}</p> : null}
              {report.status === "OPEN" || report.status === "REVIEWING" ? (
                <form action={reviewModerationReportAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea className="field min-h-20" name="resolution" maxLength={1000} placeholder="Record investigation and action taken" required />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="button-primary" name="status" value="RESOLVED" type="submit">Resolve</button>
                    <button className="button-secondary" name="status" value="DISMISSED" type="submit">Dismiss</button>
                  </div>
                </form>
              ) : <p className="mt-3 text-sm font-bold text-steel">{report.resolution}</p>}
            </article>
          )) : <p className="font-bold text-steel">No moderation reports submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection id="subscriptions" title="Platform subscriptions">
        <div className="premium-panel mb-3 border border-neutral-300 bg-white p-4 font-bold text-steel">
          <p className="font-black text-ink">No deal commission</p>
          <p>Admin charges only {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month to each active renter and host.</p>
          <p className="mt-2 font-black text-ink">Recurring company-account subscription revenue</p>
          <p>Subscriptions renew every month after admin checks the company account payment reference.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptionUsers.map((user) => {
            const nextRenewal = user.platformSubscriptionNextBilling ?? user.platformSubscriptionPeriodEnd;

            return (
              <article key={user.id} className="payment-card border border-neutral-300 bg-white p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={user.role} />
                  <StatusBadge status={user.platformSubscriptionStatus} />
                  <span className="status-pill">Recurring company-account plan</span>
                </div>
                <h3 className="text-lg font-black">{user.fullName}</h3>
                <p className="text-sm font-bold text-steel">{user.email}</p>
                <p className="mt-2 text-sm font-bold text-steel">
                  Payment reference: {user.platformSubscriptionReference || "No payment reference submitted"}
                </p>
                <p className="mt-2 text-sm font-black">
                  Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after activation"}
                </p>
                <form action={approvePlatformSubscriptionAction} className="mt-3 grid grid-cols-2 gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <button className="button-primary w-full" name="decision" value="verify" type="submit" disabled={user.platformSubscriptionStatus !== "PENDING_ADMIN"}>
                    Verify and activate
                  </button>
                  <button className="button-secondary w-full" name="decision" value="reject" type="submit" disabled={user.platformSubscriptionStatus !== "PENDING_ADMIN"}>
                    Reject reference
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </DashboardSection>

      <DashboardSection id="approvals" title="Listing approvals">
        <div className="grid gap-4">
          {listings.map((listing) => (
            (() => {
              const hostReady = Boolean(
                listing.host?.role === "HOST" &&
                !listing.host.suspended &&
                listing.host.verificationStatus === "APPROVED" &&
                listing.host.platformSubscriptionStatus === "ACTIVE"
              );
              return (
            <article key={listing.id} className="grid gap-4 border border-neutral-300 bg-white p-4 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={listing.status} />
                  <span className="status-pill">{listing.factoryType}</span>
                </div>
                <h3 className="text-xl font-black">{listing.title}</h3>
                <p className="font-bold text-steel">
                  {listing.address} · {listing.sizeSqft} sqft · {listing.powerType.replace("_", " ")}
                </p>
                <div className="admin-console__host-readiness">
                  <span>Host: {listing.host?.fullName ?? "Missing host"}</span>
                  <StatusBadge status={listing.host?.verificationStatus ?? "MISSING"} />
                  <StatusBadge status={listing.host?.platformSubscriptionStatus ?? "MISSING"} />
                  {listing.host?.suspended ? <StatusBadge status="SUSPENDED" /> : null}
                </div>
                {!hostReady ? (
                  <a className="admin-console__review-link" href="#accounts">Review host account before publishing</a>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ListingStatusButton listingId={listing.id} status="APPROVED" label={hostReady ? "Approve" : "Host pending"} icon="approve" disabled={!hostReady} />
                <ListingStatusButton listingId={listing.id} status="REJECTED" label="Reject" icon="reject" />
                <ListingStatusButton listingId={listing.id} status="SUSPENDED" label="Suspend" icon="suspend" />
              </div>
            </article>
              );
            })()
          ))}
        </div>
      </DashboardSection>

      <DashboardSection id="bookings" title="High-risk work and booking approvals">
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="grid gap-4 border border-neutral-300 bg-white p-4 lg:grid-cols-[1fr_340px]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.riskLevel} />
                </div>
                <h3 className="text-xl font-black">{booking.listing.title}</h3>
                <p className="font-bold text-steel">
                  {booking.user.fullName} · {booking.workType} · {formatCurrency(booking.grandTotal)}
                </p>
                <p className="mt-2 text-sm font-black">Deposit: {formatCurrency(booking.deposit)} / {booking.depositStatus.replaceAll("_", " ")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a className="button-secondary col-span-2 w-full" href={`/dashboard/bookings/${booking.id}/agreement`}>
                  View booking agreement
                </a>
                <a className="button-secondary col-span-2 w-full" href={`/api/bookings/${booking.id}/documents/booking-summary`}><Download size={18} aria-hidden="true" /> Download PDF</a>
                <BookingAdminButton bookingId={booking.id} action="ADMIN_APPROVE" label="Approve high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
                <BookingAdminButton bookingId={booking.id} action="ADMIN_REJECT" label="Reject high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
                <form action={updateDepositStatusAction} className="col-span-2 grid gap-2 border border-neutral-200 bg-white p-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <select className="field" name="depositStatus" defaultValue={booking.depositStatus}>
                    <option value="HELD">Held</option>
                    <option value="RELEASED">Released to renter</option>
                    <option value="PARTIALLY_RETAINED">Partially retained</option>
                    <option value="RETAINED">Retained</option>
                    <option value="DISPUTED">Disputed</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="field" name="depositReturned" type="number" min="0" placeholder="Returned amount" />
                    <input className="field" name="depositRetained" type="number" min="0" placeholder="Retained amount" />
                  </div>
                  <input className="field" name="depositNote" placeholder="Required reconciliation or dispute note" required />
                  <button className="button-secondary" type="submit">Record deposit outcome</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection id="accounts" title="Hosts and renters">
        <div className="grid gap-4 md:grid-cols-3">
          {users.map((user) => (
            <article key={user.id} className="border border-neutral-300 bg-white p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge status={user.verificationStatus} />
                {user.suspended && <StatusBadge status="SUSPENDED" />}
              </div>
              <h3 className="text-lg font-black">{user.fullName}</h3>
              <p className="text-sm font-bold text-steel">{user.companyName}</p>
              <form action={updateUserVerificationAction} className="mt-3 grid gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <select className="field" name="verificationStatus" defaultValue={user.verificationStatus}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button className="button-secondary" type="submit">Update verification</button>
              </form>
              <form action={toggleUserSuspensionAction} className="mt-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="suspended" value={String(!user.suspended)} />
                <button className="button-dark w-full" type="submit">
                  <UserX size={18} /> {user.suspended ? "Restore user" : "Suspend user"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection id="payments" title="Payment reconciliation">
        <div className="grid gap-4 lg:grid-cols-2">
          {payments.length ? payments.map((payment) => (
            <article key={payment.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={payment.kind} /><StatusBadge status={payment.status} /></div>
              <h3 className="mt-3 text-lg font-black">{payment.payer.fullName} · {formatCurrency(payment.amount)}</h3>
              <p className="mt-1 break-all text-sm font-bold text-steel">Reference: {payment.reference}</p>
              {payment.booking ? <p className="mt-1 text-sm font-bold text-steel">Booking: {payment.booking.listing.title}</p> : null}
              {payment.proofUpload ? <a className="button-secondary mt-3 w-full" href={`/api/uploads/${payment.proofUpload.id}`}>Review private proof</a> : <p className="mt-3 text-sm font-bold text-amber-800">No uploaded proof. Verify the bank reference independently.</p>}
              {payment.status === "SUBMITTED" && payment.kind === "BOOKING_TOTAL" ? <PaymentReviewForm paymentId={payment.id} action={reviewBookingPaymentAction} /> : null}
              {payment.status === "SUBMITTED" && payment.kind === "ADDITIONAL_REQUIREMENT" ? <PaymentReviewForm paymentId={payment.id} action={reviewAdditionalRequirementPaymentAction} /> : null}
            </article>
          )) : <p className="font-bold text-steel">No payment records submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection title="Privacy requests">
        <div className="grid gap-4 lg:grid-cols-2">
          {privacyRequests.length ? privacyRequests.map((request) => (
            <article key={request.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={request.type} /><StatusBadge status={request.status} /></div>
              <h3 className="mt-3 font-black">{request.user.fullName}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold text-steel">{request.detail}</p>
              {request.status === "SUBMITTED" || request.status === "IN_REVIEW" ? (
                <form action={resolvePrivacyRequestAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <textarea className="field min-h-20" name="resolution" placeholder="Record the action taken or reason" required />
                  <div className="grid grid-cols-2 gap-2">
                    {request.type !== "DELETION" ? <button className="button-primary" name="status" value="COMPLETED" type="submit">Complete</button> : <span />}
                    <button className="button-secondary" name="status" value="REJECTED" type="submit">Reject</button>
                  </div>
                </form>
              ) : null}
              {request.type === "DELETION" && (request.status === "SUBMITTED" || request.status === "IN_REVIEW") ? (
                <form action={executeAccountDeletionAction} className="mt-2 border border-red-300 bg-red-50 p-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <p className="text-xs font-black text-red-900">Checks active obligations, deletes the managed identity, and anonymizes the marketplace profile.</p>
                  <button className="button-dark mt-2 w-full" type="submit">Execute verified deletion</button>
                </form>
              ) : null}
            </article>
          )) : <p className="font-bold text-steel">No privacy requests submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection title="Deposits, disputes, and photos">
        <div className="grid gap-3 md:grid-cols-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="border border-neutral-300 bg-white p-4">
              <p className="font-black">{upload.type.replaceAll("_", " ")}</p>
              <p className="text-sm font-bold text-steel">{upload.originalName}</p>
              <p className="mt-2 text-xs font-bold text-steel">Private upload metadata for authorized dispute/deposit review.</p>
            </div>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Equipment and pricing management">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-neutral-300 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-black">
              <SlidersHorizontal className="text-hazard" size={22} /> Equipment
            </h3>
            <div className="grid gap-2">
              {equipment.map((addon) => (
                <form key={addon.slug} action={updateEquipmentPriceAction} className="grid grid-cols-[1fr_120px_110px] gap-2">
                  <input type="hidden" name="slug" value={addon.slug} />
                  <span className="self-center font-bold">{addon.name}</span>
                  <input className="field" name="pricePerBooking" type="number" defaultValue={addon.pricePerBooking} />
                  <button className="button-secondary" type="submit">Save</button>
                </form>
              ))}
            </div>
          </div>
          <div className="border border-neutral-300 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-black">
              <DollarSign className="text-hazard" size={22} /> Listing pricing
            </h3>
            <div className="grid gap-3">
              {listings.slice(0, 4).map((listing) => (
                <form key={listing.id} action={updateListingPricingAction} className="grid gap-2 border border-neutral-200 p-3">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <p className="font-black">{listing.title}</p>
                  <div className="grid grid-cols-5 gap-2">
                    <input className="field" name="priceDay" type="number" defaultValue={listing.priceDay} />
                    <input className="field" name="priceThirtyDays" type="number" defaultValue={listing.priceThirtyDays} />
                    <input className="field" name="priceSixtyDays" type="number" defaultValue={listing.priceSixtyDays} />
                    <input className="field" name="depositStandard" type="number" defaultValue={listing.depositStandard} />
                    <input className="field" name="cleaningFee" type="number" defaultValue={listing.cleaningFee} />
                  </div>
                  <button className="button-secondary" type="submit">Save pricing</button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection id="activity" title="Approval event log">
        <div className="grid gap-2">
          {approvalEvents.map((event) => (
            <div key={event.id} className="border border-neutral-300 bg-white p-3">
              <p className="font-black">{event.decision} · {event.target}</p>
              <p className="text-sm font-bold text-steel">{event.note}</p>
            </div>
          ))}
        </div>
      </DashboardSection>

      <nav className="flex items-center justify-between border-t border-neutral-300 pt-5" aria-label="Admin dashboard pages">
        {pagination.page > 1 ? <Link className="button-secondary" href={`/dashboard/admin?page=${pagination.page - 1}`}>Previous page</Link> : <span />}
        <span className="font-black text-steel">Page {pagination.page} of {pagination.totalPages}</span>
        {pagination.page < pagination.totalPages ? <Link className="button-secondary" href={`/dashboard/admin?page=${pagination.page + 1}`}>Next page</Link> : <span />}
      </nav>
      </div>
    </main>
  );
}

function DashboardSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="admin-console__section" id={id}>
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone?: "alert" }) {
  return (
    <div className={`admin-console__metric${tone === "alert" ? " admin-console__metric--alert" : ""}`}>
      <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
      <Icon size={20} className="admin-console__metric-icon" />
    </div>
  );
}

function AdminNav({ href, icon: Icon, label, count }: { href: string; icon: React.ComponentType<{ size?: number }>; label: string; count?: number }) {
  return <a href={href}><Icon size={18} /><span>{label}</span>{count ? <b>{count}</b> : null}</a>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function ListingStatusButton({ listingId, status, label, icon, disabled = false }: { listingId: string; status: "APPROVED" | "REJECTED" | "SUSPENDED"; label: string; icon: "approve" | "reject" | "suspend"; disabled?: boolean }) {
  const Icon = icon === "approve" ? CheckCircle2 : icon === "reject" ? XCircle : ShieldAlert;
  return (
    <form action={updateListingStatusAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="status" value={status} />
      <button className={icon === "approve" ? "button-primary w-full" : "button-secondary w-full"} type="submit" disabled={disabled} title={disabled ? "Approve and activate the host account first" : undefined}>
        <Icon size={18} /> {label}
      </button>
    </form>
  );
}

function BookingAdminButton({ bookingId, action, label, disabled }: { bookingId: string; action: "ADMIN_APPROVE" | "ADMIN_REJECT"; label: string; disabled: boolean }) {
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <button className={action === "ADMIN_APPROVE" ? "button-primary w-full" : "button-secondary w-full"} disabled={disabled} type="submit">
        {label}
      </button>
    </form>
  );
}

function PaymentReviewForm({ paymentId, action }: { paymentId: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input className="field" name="reviewNote" placeholder="Optional reconciliation note" />
      <div className="grid grid-cols-2 gap-2">
        <button className="button-primary" name="decision" value="verify" type="submit">Verify paid</button>
        <button className="button-secondary" name="decision" value="reject" type="submit">Reject proof</button>
      </div>
    </form>
  );
}
