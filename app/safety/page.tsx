import { ShieldAlert } from "lucide-react";
import { commonSafetyRules } from "@/src/lib/seed-data";

export default function SafetyPage() {
  return (
    <main className="section-shell py-10">
      <p className="text-sm font-black uppercase text-hazard">Safety rules</p>
      <h1 className="mt-2 text-4xl font-black">Practical controls before project work starts</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {commonSafetyRules.map((rule) => (
          <div key={rule} className="flex gap-3 border border-neutral-300 bg-white p-4">
            <ShieldAlert className="text-hazard" size={22} />
            <p className="font-black">{rule}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
