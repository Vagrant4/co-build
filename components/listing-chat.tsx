import { MessageSquare, Send } from "lucide-react";
import { sendListingMessageAction } from "@/app/actions";
import { CONTACT_POLICY_MESSAGE } from "@/src/lib/contact-policy";

export type ListingChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  sender: {
    fullName: string;
    role: string;
  };
};

export function ListingChat({
  listingSlug,
  messages,
  senderRole,
  title,
  placeholder
}: {
  listingSlug: string;
  messages: ListingChatMessage[];
  senderRole: "RENTER" | "HOST";
  title: string;
  placeholder: string;
}) {
  return (
    <section data-listing-chat aria-label="Pre-deal chat" className="grid gap-3 border border-ink bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase text-hazard">
            <MessageSquare size={17} /> Pre-deal chat
          </p>
          <h2 className="mt-1 text-xl font-black">{title}</h2>
        </div>
        <span className="status-pill">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>
      <p className="border border-hazard/40 bg-hazard/10 px-3 py-2 text-xs font-black uppercase leading-relaxed text-ink">
        {CONTACT_POLICY_MESSAGE}
      </p>

      <div className="grid max-h-72 gap-2 overflow-y-auto border border-neutral-200 bg-smoke p-2">
        {messages.length ? (
          messages.map((message) => {
            const isMine = message.sender.role === senderRole;
            return (
              <article
                key={message.id}
                className={
                  isMine
                    ? "ml-6 border border-ink bg-ink p-3 text-white"
                    : "mr-6 border border-neutral-300 bg-white p-3 text-ink"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase">
                  <span>{message.sender.fullName}</span>
                  <time className={isMine ? "text-neutral-300" : "text-steel"}>{formatChatTime(message.createdAt)}</time>
                </div>
                <p className={isMine ? "mt-1 text-sm font-bold text-neutral-100" : "mt-1 text-sm font-bold text-steel"}>{message.body}</p>
              </article>
            );
          })
        ) : (
          <p className="border border-dashed border-neutral-300 bg-white p-3 text-sm font-bold text-steel">
            Ask about access, loading, power, equipment, timing, or safety before confirming the deal.
          </p>
        )}
      </div>

      <form action={sendListingMessageAction} className="grid gap-2">
        <input type="hidden" name="listingSlug" value={listingSlug} />
        <input type="hidden" name="senderRole" value={senderRole} />
        <label className="grid gap-1">
          <span className="label">New message</span>
          <textarea className="field min-h-20 resize-y" name="message" maxLength={1000} required placeholder={placeholder} />
        </label>
        <button className="button-secondary justify-self-start" type="submit">
          <Send size={16} /> Send message
        </button>
      </form>
    </section>
  );
}

function formatChatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
