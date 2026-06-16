import type { Metadata } from "next";
import "./globals.css";
import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Co-Build | Short-term fabrication space rental",
  description: "Rent fabrication bays, maker benches, equipment add-ons, power, loading access, and safety-reviewed workspaces in Singapore."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
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
              <a href="/faq">FAQ</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
