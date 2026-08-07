import { submitPrivacyRequestAction } from "@/app/actions";
import { StatusBadge } from "./status-badge";

type PrivacyRequestView = { id: string; type: string; status: string; createdAt: Date };

export function PrivacyRequestPanel({ requests }: { requests: PrivacyRequestView[] }) {
  return (
    <section className="card mt-8 grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
      <div>
        <p className="text-sm font-black uppercase text-hazard">Privacy controls</p>
        <h2 className="mt-1 text-2xl font-black">Request access, correction, or deletion</h2>
        <div className="mt-4 grid gap-2">
          {requests.length ? requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between border border-neutral-200 bg-white p-3 text-sm font-bold">
              <span>{request.type.replaceAll("_", " ")} / {formatDate(request.createdAt)}</span>
              <StatusBadge status={request.status} />
            </div>
          )) : <p className="font-bold text-steel">No privacy requests submitted.</p>}
        </div>
      </div>
      <form action={submitPrivacyRequestAction} className="grid gap-3 border border-neutral-300 bg-white p-4">
        <label><span className="label">Request type</span><select className="field" name="privacyRequestType"><option value="ACCESS">Access my data</option><option value="CORRECTION">Correct my data</option><option value="DELETION">Delete eligible data</option></select></label>
        <label><span className="label">Details</span><textarea className="field min-h-28" name="privacyRequestDetail" required /></label>
        <button className="button-secondary" type="submit">Submit privacy request</button>
      </form>
    </section>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
