import { Bell, Check } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions";

type Notice = { id: string; title: string; body: string; status: string; createdAt: Date };

export function NotificationCenter({ notifications }: { notifications: Notice[] }) {
  const unread = notifications.filter((notice) => notice.status !== "READ");
  return (
    <section className="mb-8 border border-neutral-300 bg-white p-4" aria-labelledby="notifications-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="notifications-title" className="flex items-center gap-2 text-xl font-black"><Bell className="text-hazard" size={20} /> Notifications</h2>
        <span className="status-pill">{unread.length} unread</span>
      </div>
      <div className="mt-3 grid gap-2">
        {notifications.length ? notifications.map((notice) => (
          <article key={notice.id} className={notice.status === "READ" ? "border border-neutral-200 bg-smoke p-3" : "border border-hazard/60 bg-hazard/10 p-3"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{notice.title}</h3>
                <p className="mt-1 text-sm font-bold text-steel">{notice.body}</p>
                <time className="mt-2 block text-xs font-bold text-steel">{formatNoticeTime(notice.createdAt)}</time>
              </div>
              {notice.status !== "READ" ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notificationId" value={notice.id} />
                  <button className="button-secondary px-3 py-2 text-xs" type="submit"><Check size={14} /> Mark read</button>
                </form>
              ) : null}
            </div>
          </article>
        )) : <p className="border border-dashed border-neutral-300 p-3 text-sm font-bold text-steel">No notifications yet.</p>}
      </div>
    </section>
  );
}

function formatNoticeTime(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
