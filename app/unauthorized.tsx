import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/logo";

export default function UnauthorizedPage() {
  return (
    <main className="access-state">
      <div className="access-state__panel">
        <Logo variant="compact" className="text-white" accentClassName="text-hazard" />
        <div className="access-state__icon"><LockKeyhole size={26} aria-hidden="true" /></div>
        <p className="text-sm font-black uppercase text-hazard">Account access</p>
        <h1>Sign in required</h1>
        <p>Sign in with your SpaceOnCall account to continue to this protected workspace.</p>
        <div className="access-state__actions">
          <a className="button-primary" href="/sign-in">Sign in</a>
          <a className="button-secondary" href="/">Return home</a>
        </div>
      </div>
    </main>
  );
}
