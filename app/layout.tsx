import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { assertAuthenticationConfigured, getAppMode } from "@/src/lib/app-mode";

export const metadata: Metadata = {
  title: "Co-Build | Short-term fabrication space rental",
  description: "Rent short-term fabrication workspace by location, floor area, power, loading access, equipment, and permitted work in Singapore."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = getAppMode();
  assertAuthenticationConfigured();

  const content = (
    <html lang="en">
      <body>
        {mode === "demo" && (
          <div className="demo-banner" role="status">
            Demo mode: showcase accounts and simulated transactions only
          </div>
        )}
        <SiteHeader appMode={mode} />
        {children}
        <footer className="border-t border-neutral-300 bg-ink py-8 text-white">
          <div className="section-shell flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Logo variant="compact" className="text-white" accentClassName="text-safety" />
              <p className="text-sm text-neutral-300">Short-notice fabrication workspace with practical controls.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold text-neutral-200">
              <a href="/pricing">Pricing</a>
              <a href="/create-account">Create account</a>
              <a href="/safety">Safety</a>
              <a href="/legal">Legal Centre</a>
              <a href="/faq">FAQ</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );

  return mode === "demo" ? content : <ClerkProvider>{content}</ClerkProvider>;
}
