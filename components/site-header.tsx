"use client";

import { ClipboardCheck, Factory, LayoutDashboard, Search, ShieldCheck, UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { AccountSwitcher } from "./account-switcher";
import { Logo } from "./logo";

function getNavItems(pathname: string) {
  if (pathname.startsWith("/dashboard/host")) {
    return [
      { href: "/dashboard/host", label: "Host Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/host/listings/new", label: "List Your Space", icon: Factory }
    ];
  }

  if (pathname.startsWith("/dashboard/user")) {
    return [
      { href: "/search", label: "Find a Space", icon: Search },
      { href: "/dashboard/user", label: "My Bookings", icon: ClipboardCheck }
    ];
  }

  if (pathname.startsWith("/dashboard/admin")) {
    return [{ href: "/dashboard/admin", label: "Admin Dashboard", icon: ShieldCheck }];
  }

  return [
    { href: "/search", label: "Find a Space", icon: Search },
    { href: "/dashboard/host/listings/new", label: "List Your Space", icon: Factory },
    { href: "/create-account", label: "Create Account", icon: UserPlus }
  ];
}

export function SiteHeader() {
  const pathname = usePathname();
  const navItems = getNavItems(pathname);

  return (
    <header className="site-header">
      <div className="section-shell flex min-h-16 flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <a href="/" className="group flex items-center gap-3" aria-label="Co-Build home">
          <Logo
            variant="full"
            className="transition-colors duration-150 group-hover:text-hazard"
            wordmarkClassName="hidden sm:inline-flex"
          />
          <span className="hidden border-l border-neutral-300 pl-3 text-xs font-bold leading-tight text-steel xl:block">
            Workspace, power,
            <br />
            loading, tools
          </span>
        </a>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <AccountSwitcher />
          <nav className="site-nav">
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
        </div>
      </div>
    </header>
  );
}
