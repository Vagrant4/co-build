"use client";

import { useEffect, useState } from "react";
import { Activity, CreditCard, LayoutDashboard, ListChecks, ShieldAlert, Users } from "lucide-react";

const items = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, countKey: null },
  { id: "approvals", label: "Approvals", icon: ListChecks, countKey: "approvals" },
  { id: "accounts", label: "Hosts & renters", icon: Users, countKey: "accounts" },
  { id: "payments", label: "Payments", icon: CreditCard, countKey: "payments" },
  { id: "safety", label: "Safety & bookings", icon: ShieldAlert, countKey: "safety" },
  { id: "activity", label: "Activity log", icon: Activity, countKey: null }
] as const;

type Counts = { approvals: number; accounts: number; payments: number; safety: number };

export function AdminSectionNav({ counts }: { counts: Counts }) {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const syncHash = () => setActive(window.location.hash.slice(1).split("-")[0] || "overview");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <nav className="admin-console__nav" aria-label="Admin sections">
      {items.map(({ id, label, icon: Icon, countKey }) => {
        const count = countKey ? counts[countKey] : 0;
        return (
          <a key={id} href={`#${id}`} className={active === id ? "is-active" : undefined} aria-current={active === id ? "location" : undefined} onClick={() => setActive(id)}>
            <Icon size={18} /><span>{label}</span>{count ? <b>{count}</b> : null}
          </a>
        );
      })}
    </nav>
  );
}
