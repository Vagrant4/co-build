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
    detail: "Send login details, chat alerts, booking approvals, and generated contracts to the account email.",
    status: "NEXT"
  },
  {
    title: "Production uploads",
    detail: "Private durable Blob support is implemented. Connect the store and explicitly approve pilot scanning risk before enabling it.",
    status: "NEXT"
  },
  {
    title: "Mobile-first PWA",
    detail: "Add installable mobile web shell, camera-first upload polish, and notification prompts before native apps.",
    status: "NEXT"
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
