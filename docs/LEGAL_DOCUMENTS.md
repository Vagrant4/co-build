# Co-Build Pilot Legal Documents

## Status

The documents in `/legal` are versioned operational drafts for pilot review.
They are marked `DRAFT - LAWYER REVIEW REQUIRED` and are not legal advice,
signed agreements, or a representation that Co-Build is ready for public
production use.

Current version: `pilot-2026-08-07-r2`

## Public documents

- Marketplace terms
- Privacy notice
- Acceptable use and safety rules
- Booking, cancellation, and refund policy
- Deposits, damage, and disputes policy
- Subscription and payment policy
- Host agreement template
- Renter agreement template
- Food space pilot addendum

Each document has a readable page and a versioned PDF download. Public policy
PDFs may be cached for one hour.

## Private booking record

Renters, listing hosts, and administrators can download a booking PDF from
their dashboard. The route uses `requireBookingParticipant()` and returns a
private, non-cacheable response. It records an audit event for every download.

The booking PDF intentionally excludes email addresses, mobile numbers, and
other direct contact details. It is an operational record of stored booking
facts, not a signed lease or executed agreement.

## Manual review required before public launch

Singapore counsel should review and approve:

1. Whether each space arrangement is a lease, licence, service agreement, or
   another structure, including stamp-duty consequences.
2. Marketplace liability allocation, indemnities, limitations, dispute forum,
   termination, refunds, deposits, and damage claims.
3. Host authority, approved-use checks, building and tenancy restrictions,
   workplace safety duties, insurance, and high-risk work controls.
4. The privacy notice, consent language, retention schedule, cross-border
   processing, vendor terms, access/correction workflow, breach response, and
   published data-protection contact.
5. Subscription renewal, cancellation, receipts, taxes, and manual payment
   reconciliation.
6. Food-stall and shared-kitchen licensing, operator identity, premises use,
   sanitation, layout, trained food handlers, and non-transferability of
   licences.
7. The platform-role, user-dispute, disclaimer, indemnity, and limitation-of-
   liability clauses, including statutory duties and liabilities that cannot
   lawfully be excluded or limited.

## Not implemented in this phase

- Electronic signature or witnessed execution
- Immutable agreement acceptance records with the exact accepted document hash
- Automated email delivery
- Booking dates and calendar conflict prevention
- Bank or payment-provider reconciliation
- Final retention and deletion automation

Those items remain release blockers for the relevant production workflows.
