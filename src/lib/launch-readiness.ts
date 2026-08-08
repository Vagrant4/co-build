export type LaunchReadinessItem = {
  title: string;
  detail: string;
  status: "BUILT" | "NEXT" | "LATER";
};

export const launchReadinessItems: LaunchReadinessItem[] = [
  {
    title: "Search, listing, booking, chat, approval flow",
    detail: "Core marketplace flow is present for authenticated renter, host, and administrator roles.",
    status: "BUILT"
  },
  {
    title: "Company-account subscription proof",
    detail: "References create ledger entries and remain submitted until an administrator verifies the company account.",
    status: "BUILT"
  },
  {
    title: "Real authentication",
    detail: "Managed Clerk sessions and server-derived authorization are implemented; owner configuration is release-gated.",
    status: "BUILT"
  },
  {
    title: "Email and notification delivery",
    detail: "In-app notices, a retryable email outbox, delivery state, and operations alerts are implemented; connect and verify the sender domain.",
    status: "BUILT"
  },
  {
    title: "Production uploads",
    detail: "Private Blob support, public listing-photo proxying, validation, retention, and a fail-closed malware-scanner adapter are implemented; connect the external services.",
    status: "BUILT"
  },
  {
    title: "Mobile-first PWA",
    detail: "The responsive web app now publishes installable manifest, icon, service worker, loading, and recovery states.",
    status: "BUILT"
  },
  {
    title: "Legal templates and dispute rules",
    detail: "Versioned templates, dual-party acceptance, privacy requests, and deposit records exist; Singapore legal approval remains external.",
    status: "NEXT"
  },
  {
    title: "Native mobile app",
    detail: "Wait until repeat monthly usage proves app-store friction is worth it.",
    status: "LATER"
  }
];
