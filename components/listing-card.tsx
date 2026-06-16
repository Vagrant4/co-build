import { ArrowRight, Bolt, Ruler, Truck } from "lucide-react";
import type { Listing } from "@/src/lib/fabrication";
import { formatCurrency, sizeRequirementLabel } from "@/src/lib/fabrication";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="card overflow-hidden">
      <a href={`/listings/${listing.slug}`} className="block">
        <img src={listing.photoUrls[0]} alt="" className="h-56 w-full object-cover" />
      </a>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-hazard">{sizeRequirementLabel(listing.sizeSqft)}</p>
            <h3 className="mt-1 text-xl font-black">{listing.title}</h3>
            <p className="mt-1 text-sm text-steel">{listing.address}</p>
          </div>
          <span className="border border-ink px-2 py-1 text-sm font-black">{listing.zoning}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span className="flex items-center gap-1 font-bold text-steel">
            <Ruler size={16} /> {listing.sizeSqft} sqft
          </span>
          <span className="flex items-center gap-1 font-bold text-steel">
            <Bolt size={16} /> {listing.powerType === "THREE_PHASE" ? "3-phase" : "1-phase"}
          </span>
          <span className="flex items-center gap-1 font-bold text-steel">
            <Truck size={16} /> Loading
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-neutral-200 pt-4">
          <div>
            <p className="text-xs font-bold uppercase text-steel">From</p>
            <p className="text-2xl font-black">{formatCurrency(listing.prices.day)}/day</p>
            <p className="text-sm text-steel">{formatCurrency(listing.prices.thirtyDays)}/30 days</p>
          </div>
          <a href={`/listings/${listing.slug}`} className="button-dark">
            View <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </article>
  );
}
