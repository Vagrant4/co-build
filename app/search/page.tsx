import type { DurationDays, FactoryType, ListingFilters, PowerType, SizeBand } from "@/src/lib/fabrication";
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
    <main className="section-shell py-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-hazard">Search results</p>
        <h1 className="text-4xl font-black">Find a fabrication bay</h1>
        <p className="mt-2 max-w-3xl font-bold text-steel">
          Filter by location, required size, duration, work type, power availability, equipment, loading access, and
          factory type.
        </p>
      </div>
      <div className="mb-6 border border-neutral-300 bg-white p-4">
        <SearchForm compact />
        <form action="/search" className="mt-4 grid gap-3 border-t border-neutral-200 pt-4 md:grid-cols-5">
          <label>
            <span className="label">Min sqft</span>
            <input className="field" name="minSqft" type="number" placeholder="100" />
          </label>
          <label>
            <span className="label">Max sqft</span>
            <input className="field" name="maxSqft" type="number" placeholder="400" />
          </label>
          <label>
            <span className="label">Loading</span>
            <input className="field" name="loadingAccess" placeholder="cargo lift" />
          </label>
          <label>
            <span className="label">Factory type</span>
            <select className="field" name="factoryType" defaultValue="">
              <option value="">Any factory type</option>
              <option value="OFFICE">Office</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </label>
          <button className="button-dark self-end" type="submit">
            Apply detailed filters
          </button>
        </form>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-black">{listings.length} spaces available</p>
        <a className="text-sm font-black text-hazard" href="/dashboard/host/listings/new">
          List a workshop space
        </a>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.slug} listing={listing} />
        ))}
      </div>
    </main>
  );
}

function parseFilters(params: Record<string, string | string[] | undefined>): ListingFilters {
  const duration = one(params.durationDays);
  return {
    location: one(params.location),
    minSqft: numberOrUndefined(one(params.minSqft)),
    maxSqft: numberOrUndefined(one(params.maxSqft)),
    durationDays: parseDuration(duration),
    sizeBand: one(params.sizeBand) as SizeBand | undefined,
    workType: one(params.workType),
    powerType: one(params.powerType) as PowerType | undefined,
    equipment: many(params.equipment),
    loadingAccess: one(params.loadingAccess),
    factoryType: one(params.factoryType) as FactoryType | undefined
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
