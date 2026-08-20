import { Search } from "lucide-react";
import { seedEquipmentAddons, workTypes } from "@/src/lib/seed-data";
import { SearchDateFields } from "@/components/search-date-fields";

export function SearchForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/search" className={compact ? "search-form search-form--compact" : "search-form search-form--panel"}>
      <div className="search-form__controls">
        <label className="search-form__location">
          <span className="label">Location</span>
          <input className="field" name="location" placeholder="City, area, or district" />
        </label>
        <label className="search-form__size">
          <span className="label">Size required</span>
          <select className="field" name="sizeBand" defaultValue="">
            <option value="">Any size</option>
            <option value="UNDER_1000">Under 1,000 sqft / 93 m²</option>
            <option value="UNDER_5000">Under 5,000 sqft / 465 m²</option>
            <option value="UNDER_10000">Under 10,000 sqft / 929 m²</option>
            <option value="OVER_10000">Over 10,000 sqft / 929 m²</option>
          </select>
        </label>
        <label className="search-form__work">
          <span className="label">Intended activity</span>
          <select className="field" name="workType" defaultValue="">
            <option value="">Any work</option>
            {workTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <SearchDateFields />
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

      <details className="search-form__advanced">
        <summary className="search-form__advanced-summary">
          <span>Equipment add-ons</span>
        </summary>
        <fieldset className="search-form__equipment">
          <legend className="label">Select equipment</legend>
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
      </details>
    </form>
  );
}
