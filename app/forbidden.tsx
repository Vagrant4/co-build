import { ShieldX } from "lucide-react";
import { Logo } from "@/components/logo";

export default function ForbiddenPage() {
  return (
    <main className="access-state">
      <div className="access-state__panel">
        <Logo variant="compact" className="text-white" accentClassName="text-hazard" />
        <div className="access-state__icon"><ShieldX size={26} aria-hidden="true" /></div>
        <p className="text-sm font-black uppercase text-hazard">Restricted workspace</p>
        <h1>Access not permitted</h1>
        <p>This account does not have permission to open the requested SpaceOnCall workspace.</p>
        <div className="access-state__actions">
          <a className="button-secondary" href="/">Return home</a>
        </div>
      </div>
    </main>
  );
}
