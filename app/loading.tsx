import { Logo } from "@/components/logo";

export default function Loading() {
  return (
    <main className="section-shell grid min-h-[60vh] place-items-center py-16" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-xl border border-neutral-300 bg-white p-8 text-center">
        <Logo className="mx-auto" />
        <div className="mx-auto mt-8 h-2 w-full max-w-sm overflow-hidden bg-neutral-200">
          <div className="h-full w-1/2 animate-pulse bg-hazard" />
        </div>
        <p className="mt-4 font-black text-steel">Loading SpaceOnCall...</p>
      </div>
    </main>
  );
}
