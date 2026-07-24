export type LaunchReadinessItem = {
  title: string;
  detail: string;
  status: "BUILT" | "NEXT" | "LATER";
};

export const launchReadinessItems: LaunchReadinessItem[] = [
  {
    title: "Search, listing, booking, chat, approval flow",
    detail: "Core marketplace flow is present for renter, host, and admin demo roles.",
    status: "BUILT"
  },
  {
    title: "Company-account subscription proof",
    detail: "Users can submit S$5/month payment references; admin activates subscriptions after checking payment.",
    status: "BUILT"
  },
  {
    title: "Real authentication",
    detail: "Replace demo role switching with login, password reset, and account-level permissions.",
    status: "NEXT"
  },
  {
    title: "Email and notification delivery",
    detail: "Send login details, chat alerts, booking approvals, and generated contracts to the account email.",
    status: "NEXT"
  },
  {
    title: "Production uploads",
    detail: "Move verification, listing, check-in, and check-out files from local storage to durable cloud storage.",
    status: "NEXT"
  },
  {
    title: "Mobile-first PWA",
    detail: "Add installable mobile web shell, camera-first upload polish, and notification prompts before native apps.",
    status: "NEXT"
  },
  {
    title: "Legal templates and dispute rules",
    detail: "Finalize terms, damage liability, cancellation, deposit review, and host/renter safety declarations.",
    status: "NEXT"
  },
  {
    title: "Native mobile app",
    detail: "Wait until repeat monthly usage proves app-store friction is worth it.",
    status: "LATER"
  }
];
