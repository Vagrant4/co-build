import { MessageSquare, Send } from "lucide-react";
import { sendBookingMessageAction } from "@/app/actions";

export type BookingChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  sender: {
    fullName: string;
    role: string;
  };
};

export function BookingChat({
  bookingId,
  messages,
  senderRole,
  title,
  placeholder
}: {
  bookingId: string;
  messages: BookingChatMessage[];
  senderRole: "RENTER" | "HOST";
  title: string;
  placeholder: string;
}) {
  return (
    <section data-booking-chat className="grid gap-3 border border-neutral-300 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black uppercase text-steel">
          <MessageSquare size={17} className="text-hazard" /> {title}
        </p>
        <span className="status-pill">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>

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
            No messages yet. Start with access timing, loading needs, or safety questions.
          </p>
        )}
      </div>

      <form action={sendBookingMessageAction} className="grid gap-2">
        <input type="hidden" name="bookingId" value={bookingId} />
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
