import type { DurationDays, ListingFilters, PowerType, SizeBand } from "@/src/lib/fabrication";
import { ListingCard } from "@/components/listing-card";
import { SearchForm } from "@/components/search-form";
import { getApprovedListings } from "@/src/lib/repository";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseFilters(params);
  const listings = await getApprovedListings(filters);

  return (
    <main>
      <section className="page-hero">
        <div className="section-shell">
          <p className="text-sm font-black uppercase text-safety">Search results</p>
          <h1 className="mt-2 text-4xl font-black text-white md:text-6xl">Find business space</h1>
          <p className="mt-3 max-w-3xl text-lg font-bold text-neutral-300">
            Filter by location, required area, requested check-in and check-out dates, intended activity, available equipment, and loading access.
          </p>
        </div>
      </section>
      <section className="section-shell pt-8 pb-12">
      <div className="filter-panel mb-6">
        <SearchForm compact />
        <form action="/search" className="mt-4 grid gap-3 border-t border-neutral-200 pt-4 md:grid-cols-4">
          <label>
            <span className="label">Minimum area</span>
            <input className="field" name="minArea" type="number" min="1" step="1" inputMode="numeric" placeholder="100" />
          </label>
          <label>
            <span className="label">Maximum area</span>
            <input className="field" name="maxArea" type="number" min="1" step="1" inputMode="numeric" placeholder="400" />
          </label>
          <label>
            <span className="label">Area unit</span>
            <select className="field" name="areaUnit" defaultValue="SQFT">
              <option value="SQFT">Square feet (sqft)</option>
              <option value="SQM">Square metres (m²)</option>
            </select>
          </label>
          <label>
            <span className="label">Loading</span>
            <input className="field" name="loadingAccess" placeholder="cargo lift" />
          </label>
          <button className="button-dark self-end" type="submit">
            Apply detailed filters
          </button>
        </form>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-black">{listings.length} spaces available</p>
        <a className="text-sm font-black text-hazard" href="/dashboard/host/listings/new">
          List a business space
        </a>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.slug} listing={listing} />
        ))}
      </div>
      </section>
    </main>
  );
}

function parseFilters(params: Record<string, string | string[] | undefined>): ListingFilters {
  const duration = one(params.durationDays);
  return {
    location: one(params.location),
    checkIn: one(params.checkIn),
    checkOut: one(params.checkOut),
    minSqft: areaInSqft(one(params.minArea) ?? one(params.minSqft), one(params.areaUnit)),
    maxSqft: areaInSqft(one(params.maxArea) ?? one(params.maxSqft), one(params.areaUnit)),
    durationDays: parseDuration(duration),
    sizeBand: one(params.sizeBand) as SizeBand | undefined,
    workType: one(params.workType),
    powerType: one(params.powerType) as PowerType | undefined,
    equipment: many(params.equipment),
    loadingAccess: one(params.loadingAccess)
  };
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function many(value: string | string[] | undefined) {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item) => item && item !== "other");
}

function parseDuration(value?: string): DurationDays | undefined {
  const duration = Number(value);
  return duration === 1 || duration === 7 || duration === 30 || duration === 60 ? duration : undefined;
}

function numberOrUndefined(value?: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function areaInSqft(value?: string, unit?: string) {
  const area = numberOrUndefined(value);
  if (!area) return undefined;
  return unit === "SQM" ? Math.round(area * 10.7639) : area;
}
