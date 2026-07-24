import { CheckCircle2, Clock3, Wrench } from "lucide-react";
import { launchReadinessItems, type LaunchReadinessItem } from "@/src/lib/launch-readiness";

export function LaunchReadinessPanel() {
  const grouped = {
    BUILT: launchReadinessItems.filter((item) => item.status === "BUILT"),
    NEXT: launchReadinessItems.filter((item) => item.status === "NEXT"),
    LATER: launchReadinessItems.filter((item) => item.status === "LATER")
  };

  return (
    <section className="mb-8 co-build-section">
      <div className="co-build-section__header">
        <span className="co-build-section__number">!</span>
        <div>
          <p className="text-sm font-black uppercase text-hazard">Launch readiness</p>
          <h2 className="text-2xl font-black">What else needs to be built before going live</h2>
          <p className="mt-1 font-bold text-steel">
            Keep the web MVP first. Build the missing trust, payment-proof, and notification pieces before native mobile.
          </p>
        </div>
      </div>
      <div className="co-build-section__body grid gap-4 lg:grid-cols-3">
        <ReadinessColumn title="Built now" items={grouped.BUILT} icon="built" />
        <ReadinessColumn title="Build next" items={grouped.NEXT} icon="next" />
        <ReadinessColumn title="Later" items={grouped.LATER} icon="later" />
      </div>
    </section>
  );
}

function ReadinessColumn({
  title,
  items,
  icon
}: {
  title: string;
  items: LaunchReadinessItem[];
  icon: "built" | "next" | "later";
}) {
  const Icon = icon === "built" ? CheckCircle2 : icon === "next" ? Wrench : Clock3;

  return (
    <div className="border border-neutral-300 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
        <Icon size={20} className="text-hazard" aria-hidden="true" />
        {title}
      </h3>
      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.title} className="border border-neutral-200 bg-smoke p-3">
            <p className="font-black">{item.title}</p>
            <p className="mt-1 text-sm font-bold text-steel">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
