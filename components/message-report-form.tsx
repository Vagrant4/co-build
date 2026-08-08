import { Flag } from "lucide-react";
import { reportMessageAction } from "@/app/actions";

export function MessageReportForm({ messageId, messageKind, dark = false }: { messageId: string; messageKind: "BOOKING" | "CONVERSATION"; dark?: boolean }) {
  return (
    <details className="mt-2 text-xs">
      <summary className={dark ? "cursor-pointer font-black uppercase text-neutral-300" : "cursor-pointer font-black uppercase text-steel"}>
        <span className="inline-flex items-center gap-1"><Flag size={12} /> Report</span>
      </summary>
      <form action={reportMessageAction} className="mt-2 grid gap-2 border border-neutral-300 bg-white p-2 text-ink">
        <input type="hidden" name="messageId" value={messageId} />
        <input type="hidden" name="messageKind" value={messageKind} />
        <label className="grid gap-1">
          <span className="font-black uppercase">Reason</span>
          <select className="field py-2 text-sm" name="reason" defaultValue="UNSAFE_REQUEST">
            <option value="CONTACT_SHARING">Contact sharing</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="UNSAFE_REQUEST">Unsafe request</option>
            <option value="SPAM">Spam</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <input className="field py-2 text-sm" name="detail" maxLength={1000} placeholder="Optional context" />
        <button className="button-secondary justify-self-start py-2 text-xs" type="submit">Submit report</button>
      </form>
    </details>
  );
}
