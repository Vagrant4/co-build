"use client";

import { BriefcaseBusiness, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

export function AccountSwitcher() {
  const pathname = usePathname();
  const isHost = pathname.startsWith("/dashboard/host");
  const isUser = pathname.startsWith("/dashboard/user");

  if (!isHost && !isUser) {
    return null;
  }

  const current = isHost ? "Host account" : "User account";
  const switchTarget = isHost
    ? { label: "User", href: "/dashboard/user", icon: UserRound, ariaLabel: "Switch to User account" }
    : { label: "Owner", href: "/dashboard/host", icon: BriefcaseBusiness, ariaLabel: "Switch to Host account" };
  const SwitchIcon = switchTarget.icon;

  return (
    <div className="flex flex-wrap items-center gap-2 border border-neutral-300 bg-smoke px-2 py-2">
      <span className="px-1 text-xs font-black uppercase text-steel">Current: {current}</span>
      <a
        href={switchTarget.href}
        aria-label={switchTarget.ariaLabel}
        className="inline-flex min-h-9 items-center gap-2 border border-neutral-300 bg-white px-3 text-sm font-black hover:border-hazard hover:text-hazard"
      >
        <SwitchIcon size={16} aria-hidden="true" />
        {switchTarget.label}
      </a>
    </div>
  );
}
