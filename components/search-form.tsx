import { Search } from "lucide-react";
import { seedEquipmentAddons, workTypes } from "@/src/lib/seed-data";

export function SearchForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/search" className={compact ? "grid gap-3 lg:grid-cols-8" : "grid gap-3 rounded-none border border-ink bg-white p-4 shadow-hard lg:grid-cols-8"}>
      <label className="lg:col-span-2">
        <span className="label">Location</span>
        <input className="field" name="location" placeholder="Kallang, Tuas, Woodlands" />
      </label>
      <label>
        <span className="label">Size required</span>
        <select className="field" name="sizeBand" defaultValue="">
          <option value="">Any size</option>
          <option value="UNDER_1000">Smaller than 1,000 sqft</option>
          <option value="UNDER_5000">Smaller than 5,000 sqft</option>
          <option value="UNDER_10000">Smaller than 10,000 sqft</option>
          <option value="OVER_10000">Bigger than 10,000 sqft</option>
        </select>
      </label>
      <label>
        <span className="label">Work</span>
        <select className="field" name="workType" defaultValue="">
          <option value="">Any work</option>
          {workTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Duration</span>
        <select className="field" name="durationDays" defaultValue="1">
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </label>
      <label>
        <span className="label">Power</span>
        <select className="field" name="powerType" defaultValue="">
          <option value="">Any</option>
          <option value="SINGLE_PHASE">Single-phase</option>
          <option value="THREE_PHASE">Three-phase</option>
        </select>
      </label>
      <fieldset className="lg:col-span-8">
        <legend className="label">Equipment</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {seedEquipmentAddons.map((addon) => (
            <label
              key={addon.slug}
              className="flex min-h-12 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-sm font-bold hover:border-hazard"
            >
              <input className="h-4 w-4 accent-hazard" type="checkbox" name="equipment" value={addon.slug} />
              <span>{addon.name}</span>
            </label>
          ))}
          <label className="flex min-h-12 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-sm font-bold hover:border-hazard">
            <input className="h-4 w-4 accent-hazard" type="checkbox" name="equipment" value="other" />
            <span>Other</span>
          </label>
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="label">Other, state:</span>
            <input className="field" name="equipmentOther" placeholder="State equipment required" />
          </label>
        </div>
      </fieldset>
      <button className="button-primary self-end" type="submit">
        <Search size={18} /> Search
      </button>
    </form>
  );
}
