"use client";

import { ClipboardCheck, Factory, LayoutDashboard, Menu, Search, ShieldCheck, UserPlus } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import type { UserRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { AccountSwitcher } from "./account-switcher";
import { Logo } from "./logo";

function getNavItems(pathname: string, role: UserRole | null) {
  if (role === "HOST" || pathname.startsWith("/dashboard/host")) {
    return [
      { href: "/dashboard/host", label: "Host Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/host/listings/new", label: "List Your Space", icon: Factory }
    ];
  }

  if (role === "RENTER" || pathname.startsWith("/dashboard/user")) {
    return [
      { href: "/search", label: "Find a Space", icon: Search },
      { href: "/dashboard/user", label: "My Bookings", icon: ClipboardCheck }
    ];
  }

  if (role === "ADMIN" || pathname.startsWith("/dashboard/admin")) {
    return [{ href: "/dashboard/admin", label: "Admin Dashboard", icon: ShieldCheck }];
  }

  return [
    { href: "/search", label: "Find a Space", icon: Search },
    { href: "/dashboard/host/listings/new", label: "List Your Space", icon: Factory },
    { href: "/create-account", label: "Create Account", icon: UserPlus }
  ];
}

export function SiteHeader({ appMode, accountRole }: { appMode: "demo" | "pilot" | "production"; accountRole: UserRole | null }) {
  const pathname = usePathname();
  const navItems = getNavItems(pathname, accountRole);

  return (
    <header className="site-header">
      <div className="section-shell site-header__inner">
        <a href="/" className="site-header__brand group" aria-label="SpaceOnCall home">
          <Logo variant="compact" className="transition-colors duration-150 group-hover:text-hazard" />
          <span className="hidden border-l border-neutral-300 pl-3 text-xs font-bold leading-tight text-steel xl:block">
            Workspace, power,
            <br />
            loading, tools
          </span>
        </a>

        <div className="site-header__desktop-actions">
          <AccountSwitcher appMode={appMode} />
          <Navigation pathname={pathname} navItems={navItems} />
          {appMode !== "demo" && <ManagedAccountControl accountRole={accountRole} />}
        </div>

        <details className="site-header__mobile-menu">
          <summary aria-label="Open navigation menu">
            <Menu size={20} aria-hidden="true" />
            <span>Menu</span>
          </summary>
          <div className="site-header__mobile-panel">
            <AccountSwitcher appMode={appMode} />
            <Navigation pathname={pathname} navItems={navItems} />
            {appMode !== "demo" && <ManagedAccountControl accountRole={accountRole} />}
          </div>
        </details>
      </div>
    </header>
  );
}

function Navigation({
  pathname,
  navItems
}: {
  pathname: string;
  navItems: ReturnType<typeof getNavItems>;
}) {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "site-nav__item site-nav__item--active" : "site-nav__item"}
          >
            <Icon size={16} aria-hidden="true" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function ManagedAccountControl({ accountRole }: { accountRole: UserRole | null }) {
  const { isSignedIn } = useAuth();
  const roleLabel = accountRole === "RENTER" ? "Renter" : accountRole === "HOST" ? "Host" : accountRole === "ADMIN" ? "Admin" : null;
  return (
    <div className="flex items-center gap-2">
      {isSignedIn ? (
        <>
          {roleLabel ? <span className="status-pill hidden sm:inline-flex">{roleLabel}</span> : null}
          <UserButton />
        </>
      ) : (
        <a className="button-secondary" href="/sign-in">Sign in</a>
      )}
    </div>
  );
}
