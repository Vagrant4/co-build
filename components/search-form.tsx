import { Search } from "lucide-react";
import { seedEquipmentAddons, workTypes } from "@/src/lib/seed-data";

export function SearchForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/search" className={compact ? "search-form" : "search-form search-form--panel"}>
      <div className="search-form__controls">
        <label className="search-form__location">
          <span className="label">Location</span>
          <input className="field" name="location" placeholder="Kallang, Tuas, Woodlands" />
        </label>
        <label className="search-form__size">
          <span className="label">Size required</span>
          <select className="field" name="sizeBand" defaultValue="">
            <option value="">Any size</option>
            <option value="UNDER_1000">Smaller than 1,000 sqft</option>
            <option value="UNDER_5000">Smaller than 5,000 sqft</option>
            <option value="UNDER_10000">Smaller than 10,000 sqft</option>
            <option value="OVER_10000">Bigger than 10,000 sqft</option>
          </select>
        </label>
        <label className="search-form__work">
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
        <label className="search-form__duration">
          <span className="label">Duration</span>
          <select className="field" name="durationDays" defaultValue="1">
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>
        <label className="search-form__power">
          <span className="label">Power</span>
          <select className="field" name="powerType" defaultValue="">
            <option value="">Any</option>
            <option value="SINGLE_PHASE">Single-phase</option>
            <option value="THREE_PHASE">Three-phase</option>
          </select>
        </label>
        <button className="button-primary search-form__button" type="submit">
          <Search size={18} /> Search
        </button>
      </div>
      <fieldset className="search-form__equipment">
        <legend className="label">Equipment</legend>
        <div className="search-form__equipment-grid">
          {seedEquipmentAddons.map((addon) => (
            <label key={addon.slug} className="search-form__checkbox">
              <input className="h-4 w-4 accent-hazard" type="checkbox" name="equipment" value={addon.slug} />
              <span>{addon.name}</span>
            </label>
          ))}
          <label className="search-form__checkbox">
            <input className="h-4 w-4 accent-hazard" type="checkbox" name="equipment" value="other" />
            <span>Other</span>
          </label>
          <label className="search-form__other-equipment">
            <span className="label">Other, state:</span>
            <input className="field" name="equipmentOther" placeholder="State equipment required" />
          </label>
        </div>
      </fieldset>
    </form>
  );
}
