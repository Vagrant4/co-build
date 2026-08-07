import { formatCurrency } from "./fabrication";

export const LEGAL_DOCUMENT_VERSION = "pilot-2026-08-07-r2";
export const LEGAL_DOCUMENT_REVIEW_STATUS = "DRAFT - LAWYER REVIEW REQUIRED";

export type LegalDocumentSlug =
  | "marketplace-terms"
  | "privacy-notice"
  | "acceptable-use"
  | "booking-cancellation"
  | "deposits-damage-disputes"
  | "subscription-payments"
  | "host-agreement"
  | "renter-agreement"
  | "food-space-addendum";

export type LegalDocumentSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: LegalDocumentSlug;
  title: string;
  shortTitle: string;
  audience: string;
  summary: string;
  version: string;
  sections: LegalDocumentSection[];
};

const draftNotice =
  "This pilot template is not legal advice and is not an executed agreement. Co-Build must obtain Singapore legal review before relying on it for a public launch.";

export const legalDocuments: LegalDocument[] = [
  {
    slug: "marketplace-terms",
    title: "Co-Build Marketplace Terms",
    shortTitle: "Marketplace terms",
    audience: "All platform users",
    summary: "Core rules for using Co-Build to discover, discuss, and confirm short-term business space bookings.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Platform role",
        paragraphs: [
          "Co-Build provides listing, messaging, document, and deal-confirmation tools. The host and renter contract directly for each space booking. Co-Build is not a party to the space booking agreement and is not the landlord, tenant, licensor, licensee, operator, employer, insurer, agent, broker, or safety supervisor for a listed space.",
          "Co-Build prepares booking records from information and confirmations submitted by the host and renter for their review, acknowledgement, and record purposes. Co-Build charges a recurring platform subscription and no deal commission during the pilot."
        ]
      },
      {
        heading: "Account and conduct",
        paragraphs: [
          "Users must provide accurate account information, keep access credentials secure, and use the platform only for lawful business purposes.",
          "Contact details must not be posted in listing or booking chat. Parties should keep pre-booking communication on Co-Build so approvals and agreed facts remain traceable."
        ]
      },
      {
        heading: "Bookings and responsibility",
        paragraphs: [
          "A booking is subject to the listing rules, approved work type, safety acceptance, required verification, and any host or administrator approval shown on the platform.",
          "Each party remains responsible for checking authority, approved use, licences, insurance, tax, stamp duty, safety obligations, and any site-specific legal requirements."
        ]
      },
      {
        heading: "Pilot limitations",
        paragraphs: [
          "Payment confirmation is recorded from user-submitted company-account references and is not automated bank reconciliation.",
          "A generated booking record is operational evidence only until the parties execute a lawyer-approved agreement through an approved signing process."
        ]
      },
      {
        heading: "User disputes and platform liability",
        paragraphs: [
          "A dispute about the space, access, work, equipment, payment, deposit, damage, cancellation, or performance is between the host and renter. Co-Build may preserve records, enforce platform rules, or facilitate communication, but does not adjudicate legal liability or guarantee either party's performance.",
          "To the fullest extent permitted by applicable law, Co-Build is not liable for loss arising solely from a host's or renter's act, omission, breach, dispute, space, equipment, or work. Nothing in these terms excludes or limits Co-Build's liability or legal obligations where they cannot lawfully be excluded or limited."
        ]
      }
    ]
  },
  {
    slug: "privacy-notice",
    title: "Co-Build Privacy Notice",
    shortTitle: "Privacy notice",
    audience: "Renters, hosts, and account applicants",
    summary: "How pilot account, booking, chat, verification, and upload data is handled.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Data collected and purpose",
        paragraphs: [
          "Co-Build may collect identity, company, account, listing, booking, subscription-reference, chat, verification, and site-condition upload data to operate and secure the marketplace.",
          "Data should be collected only for notified operational, compliance, fraud-prevention, support, and legal purposes."
        ]
      },
      {
        heading: "Access, use, and disclosure",
        paragraphs: [
          "Booking and conversation data is restricted to the relevant renter, listing host, and authorized administrators. Verification and condition files are private and require participant or administrator authorization.",
          "Service providers may process data only for contracted hosting, authentication, storage, security, and support purposes under appropriate safeguards."
        ]
      },
      {
        heading: "Retention and security",
        paragraphs: [
          "Co-Build must define and enforce a retention schedule. Personal data should be deleted or anonymized when it is no longer needed for business or legal purposes.",
          "Reasonable access controls, private durable storage, audit records, backups, incident response, and secure disposal should protect data throughout its lifecycle."
        ]
      },
      {
        heading: "Individual requests and incidents",
        paragraphs: [
          "Users may request to access or correct their personal data, subject to applicable exceptions and identity checks.",
          "Co-Build must appoint a data protection officer, publish a working privacy contact, assess suspected incidents, and notify affected individuals and the regulator when a data breach is legally notifiable."
        ]
      }
    ]
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use and Safety Rules",
    shortTitle: "Acceptable use and safety",
    audience: "Renters and hosts",
    summary: "Minimum platform conduct and site-safety controls for short-term workspace use.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Always prohibited",
        paragraphs: [
          "No illegal activity, overnight sleeping, unauthorized storage, blocked access routes, deliberate safety-system interference, or work outside the approved booking scope.",
          "Users must not bypass guards, exceed electrical capacity, operate equipment without permission, or bring undeclared hazardous materials on site."
        ]
      },
      {
        heading: "Controlled work",
        paragraphs: [
          "Hot work, welding, grinding, spray painting, chemical work, noisy work, and other high-risk activities require the approvals shown in the listing and booking workflow.",
          "Required PPE, competency, supervision, permits, fire controls, ventilation, and exclusion zones must be confirmed before work starts."
        ]
      },
      {
        heading: "Condition and waste",
        paragraphs: [
          "Required check-in and check-out photos must accurately show the site condition. Damage, incidents, unsafe conditions, and equipment faults must be reported promptly.",
          "The renter must clear waste and return the space in the agreed condition unless a different written arrangement is recorded."
        ]
      }
    ]
  },
  {
    slug: "booking-cancellation",
    title: "Booking, Cancellation and Refund Policy",
    shortTitle: "Booking and cancellation",
    audience: "Renters and hosts",
    summary: "Pilot rules for booking requests, approvals, changes, cancellations, and refunds.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Booking formation",
        paragraphs: [
          "A request is not confirmed until required host and administrator approvals are complete, safety rules are accepted, payment is confirmed, and both parties confirm the deal on the platform.",
          "Listing availability, permitted work, duration, price, deposit, cleaning fee, add-ons, and special requirements form the operational booking record."
        ]
      },
      {
        heading: "Changes and cancellation",
        paragraphs: [
          "The listing-specific cancellation policy applies unless the parties record a lawful written variation before confirmation.",
          "Material changes to work type, duration, equipment, access, or risk must be resubmitted for approval before the changed activity begins."
        ]
      },
      {
        heading: "Refund review",
        paragraphs: [
          "Refund decisions should consider the listing policy, cancellation timing, documented site access, payment evidence, direct costs, and any safety or compliance suspension.",
          "Co-Build records the dispute and supporting evidence but does not make an automatic legal determination of liability during the pilot."
        ]
      }
    ]
  },
  {
    slug: "deposits-damage-disputes",
    title: "Deposits, Damage and Disputes Policy",
    shortTitle: "Deposits and disputes",
    audience: "Renters and hosts",
    summary: "Evidence and review rules for deposits, damage, cleaning, and booking disputes.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Deposit purpose",
        paragraphs: [
          "The booking record must state the deposit amount and any high-risk addition. The party receiving funds must keep accurate payment and return records.",
          "A deposit is not platform revenue and must not be treated as a penalty without a lawful contractual basis."
        ]
      },
      {
        heading: "Damage evidence",
        paragraphs: [
          "Claims should identify the affected item, check-in and check-out evidence, incident timing, repair or replacement basis, and any renter response.",
          "Normal wear, pre-existing conditions, and undocumented allegations should not be charged as renter damage."
        ]
      },
      {
        heading: "Dispute handling",
        paragraphs: [
          "Parties should first use the booking chat and platform dispute record. Co-Build may preserve relevant records and restrict unsafe accounts while reviewing operational facts.",
          "Unresolved legal disputes remain between the contracting parties and may require mediation, legal advice, or the appropriate Singapore forum."
        ]
      }
    ]
  },
  {
    slug: "subscription-payments",
    title: "Platform Subscription and Payment Policy",
    shortTitle: "Subscription and payments",
    audience: "Renters and hosts",
    summary: "Recurring platform subscription and company-account payment rules for the pilot.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Recurring subscription",
        paragraphs: [
          "The pilot subscription is S$5 per month for each active renter or host account unless a different published plan applies.",
          "Subscription access renews monthly after Co-Build verifies the payment reference. Co-Build does not charge either side a commission on the booking value."
        ]
      },
      {
        heading: "Payment method",
        paragraphs: [
          "Payments are made directly to the company account by an approved method such as PayNow or bank transfer. Users must submit an accurate reference through the platform.",
          "A submitted reference is not proof that funds settled. Administrator activation records manual verification only."
        ]
      },
      {
        heading: "Renewal and cancellation",
        paragraphs: [
          "A user may stop future renewal subject to the published notice process. Cancellation does not cancel an existing booking or remove outstanding obligations.",
          "Failed or unverified renewal may restrict new transactions while preserving access required to resolve existing bookings and legal obligations."
        ]
      }
    ]
  },
  {
    slug: "host-agreement",
    title: "Pilot Host Agreement Template",
    shortTitle: "Host agreement",
    audience: "Space owners and authorized operators",
    summary: "Draft host obligations for listing authority, accuracy, safety, and booking delivery.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Authority and approved use",
        paragraphs: [
          "The host must have authority to offer the space and must verify the premises' approved use, occupancy conditions, lease or licence restrictions, and any required permissions.",
          "A listing must not imply that Co-Build has verified title, planning use, licensing, or fitness for a specific activity unless expressly confirmed."
        ]
      },
      {
        heading: "Listing and site accuracy",
        paragraphs: [
          "The host must accurately state area, access, power, loading, equipment, prices, deposits, fees, permitted work, prohibited work, safety controls, and availability.",
          "Material defects, access restrictions, outages, incidents, or compliance changes must be disclosed promptly."
        ]
      },
      {
        heading: "Safety and booking delivery",
        paragraphs: [
          "The host remains responsible for duties applying to the premises and its operations, including safe access, maintained facilities, emergency arrangements, and risk controls.",
          "The host must provide the booked space as agreed, keep communication on-platform, document variations, and handle deposits and damage claims transparently."
        ]
      }
    ]
  },
  {
    slug: "renter-agreement",
    title: "Pilot Renter Agreement Template",
    shortTitle: "Renter agreement",
    audience: "Businesses and project teams renting space",
    summary: "Draft renter obligations for approved work, safety, condition, and payment.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Approved work and users",
        paragraphs: [
          "The renter must accurately declare the work, materials, equipment, experience, personnel, duration, access needs, and any controlled activity.",
          "Only approved users and activities may enter or use the space. Material changes require fresh approval."
        ]
      },
      {
        heading: "Safety and condition",
        paragraphs: [
          "The renter must follow site rules, PPE requirements, risk controls, permits, operating instructions, emergency procedures, and lawful directions.",
          "The renter must complete required condition photos, report incidents and damage, protect access routes, and clear waste."
        ]
      },
      {
        heading: "Payment and responsibility",
        paragraphs: [
          "The renter must pay the stated rent, deposit, cleaning fee, and approved add-ons through the agreed direct company-account process.",
          "The renter is responsible for losses caused by its breach or negligence, subject to the final lawyer-approved agreement and applicable law."
        ]
      }
    ]
  },
  {
    slug: "food-space-addendum",
    title: "Food Space Pilot Addendum",
    shortTitle: "Food space addendum",
    audience: "Food-stall hosts and food-business renters",
    summary: "Additional draft controls for food stalls, shared kitchens, and food-production spaces.",
    version: LEGAL_DOCUMENT_VERSION,
    sections: [
      {
        heading: "Licence and premises",
        paragraphs: [
          "The parties must identify the operator responsible for each required food retail, food processing, or premises licence and confirm that the proposed activity fits the approved premises use.",
          "A listing or booking must not represent that a licence transfers automatically with the space."
        ]
      },
      {
        heading: "Food safety and facilities",
        paragraphs: [
          "The booking must state the permitted menu or process, trained personnel, storage, temperature control, washing, ventilation, grease, pest, allergen, and waste arrangements.",
          "Shared facilities and equipment must have clear cleaning responsibility and handover records."
        ]
      },
      {
        heading: "Documents and approvals",
        paragraphs: [
          "The parties should retain the tenancy or licence evidence, layout, authority approvals, licence records, inspection records, and any stamp-duty evidence required for the arrangement.",
          "Food operations must not begin until all required approvals are active and consistent with the actual operator and activity."
        ]
      }
    ]
  }
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return legalDocuments.find((document) => document.slug === slug);
}

export function renderLegalDocumentText(document: LegalDocument): string {
  return [
    document.title.toUpperCase(),
    LEGAL_DOCUMENT_REVIEW_STATUS,
    `Version: ${document.version}`,
    `Audience: ${document.audience}`,
    "",
    draftNotice,
    "",
    ...document.sections.flatMap((section) => [
      section.heading.toUpperCase(),
      ...section.paragraphs,
      ""
    ])
  ].join("\n").trim();
}

type BookingDocumentInput = {
  bookingId: string;
  createdAt: Date;
  listingTitle: string;
  listingAddress: string;
  hostName: string;
  hostCompanyName: string;
  renterName: string;
  renterCompanyName: string;
  durationDays: number;
  startAt?: Date | null;
  endAt?: Date | null;
  workType: string;
  riskLevel: string;
  status: string;
  rentalTotal: number;
  deposit: number;
  cleaningFee: number;
  addonTotal: number;
  grandTotal: number;
  safetyAcceptedAt: Date | null;
  renterDealConfirmedAt: Date | null;
  hostDealConfirmedAt: Date | null;
  cancellationPolicy: string;
  addons: Array<{ name: string; price: number }>;
  additionalRequirements: Array<{ detail: string; status: string; quotedRate: number }>;
};

export function buildBookingDocument(input: BookingDocumentInput): string {
  const dealStatus = input.renterDealConfirmedAt && input.hostDealConfirmedAt
    ? "Renter and host confirmed"
    : input.renterDealConfirmedAt
      ? "Renter confirmed; host pending"
      : input.hostDealConfirmedAt
        ? "Host confirmed; renter pending"
        : "Both parties pending";
  const addons = input.addons.length
    ? input.addons.map((addon) => `${addon.name} - ${formatCurrency(addon.price)}`)
    : ["None recorded"];
  const requirements = input.additionalRequirements.length
    ? input.additionalRequirements.map((item) => `${item.detail} - ${item.status.replaceAll("_", " ")} - ${formatCurrency(item.quotedRate)}`)
    : ["None recorded"];

  return [
    "PRIVATE PILOT BOOKING RECORD",
    LEGAL_DOCUMENT_REVIEW_STATUS,
    "NOT A SIGNED LEASE OR EXECUTED AGREEMENT",
    `Template version: ${LEGAL_DOCUMENT_VERSION}`,
    "",
    "RECORD",
    `Booking ID: ${input.bookingId}`,
    `Created: ${formatDate(input.createdAt)}`,
    `Booking status: ${input.status.replaceAll("_", " ")}`,
    `Deal confirmation: ${dealStatus}`,
    "",
    "PARTIES AND SPACE",
    `Host: ${input.hostName} / ${input.hostCompanyName}`,
    `Renter: ${input.renterName} / ${input.renterCompanyName}`,
    `Listing: ${input.listingTitle}`,
    `Location: ${input.listingAddress}`,
    "",
    "CONTRACTING PARTIES AND PLATFORM ROLE",
    "The space booking arrangement recorded here is made directly between the host and renter identified in this record. Separate Co-Build marketplace terms govern each party's use of the platform.",
    "Co-Build provides the marketplace and prepares this record from information and confirmations submitted by the host and renter for their review, acknowledgement and record purposes.",
    "Co-Build is not a party to the space booking agreement and is not the landlord, tenant, licensor, licensee, operator, agent, broker, insurer, safety supervisor, or guarantor of the space or either party's performance.",
    "The host and renter remain responsible for checking the accuracy, authority, approved use, licences, suitability, safety, insurance, payment, tax, stamp duty, and performance of their arrangement.",
    "",
    "BOOKING SCOPE",
    `Booking start: ${input.startAt ? formatDate(input.startAt) : "Legacy booking - date not recorded"}`,
    `Booking end: ${input.endAt ? formatDate(input.endAt) : "Legacy booking - date not recorded"}`,
    `Duration: ${input.durationDays} days`,
    `Work type: ${input.workType}`,
    `Risk level: ${input.riskLevel.replaceAll("_", " ")}`,
    `Safety rules accepted: ${input.safetyAcceptedAt ? formatDate(input.safetyAcceptedAt) : "Not recorded"}`,
    "",
    "PRICE RECORD",
    `Rental: ${formatCurrency(input.rentalTotal)}`,
    `Deposit: ${formatCurrency(input.deposit)}`,
    `Cleaning fee: ${formatCurrency(input.cleaningFee)}`,
    `Equipment add-ons: ${formatCurrency(input.addonTotal)}`,
    `Grand total: ${formatCurrency(input.grandTotal)}`,
    "",
    "EQUIPMENT ADD-ONS",
    ...addons,
    "",
    "ADDITIONAL REQUIREMENTS",
    ...requirements,
    "",
    "CANCELLATION POLICY",
    input.cancellationPolicy,
    "",
    "DISPUTES AND PLATFORM LIABILITY",
    "Any dispute about the space, access, work, equipment, payment, deposit, damage, cancellation, or performance is between the host and renter. The parties should first preserve evidence and use the Co-Build booking chat, then seek mediation or independent legal advice where appropriate.",
    "Co-Build may preserve platform records, enforce platform rules, or facilitate communication, but is not required to adjudicate the dispute, determine legal liability, reimburse either party, or guarantee performance.",
    "To the fullest extent permitted by applicable law, Co-Build is not liable for loss arising solely from a host's or renter's act, omission, breach, dispute, space, equipment, or work. Nothing in this notice excludes or limits Co-Build's own liability or legal obligations where they cannot lawfully be excluded or limited.",
    "",
    "STATUS NOTICE",
    "This private record summarizes facts stored on Co-Build. It contains no direct contact details and is not legal advice. It does not replace a lawyer-approved and properly executed agreement where one is required."
  ].join("\n");
}

export function legalDocumentFilename(document: LegalDocument): string {
  return `co-build-${document.slug}-${document.version}.pdf`;
}

export function bookingDocumentFilename(bookingId: string): string {
  return `co-build-booking-${bookingId}-${LEGAL_DOCUMENT_VERSION}.pdf`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore"
  }).format(date);
}
