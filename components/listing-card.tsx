import { ArrowRight, Bolt, Ruler, Truck } from "lucide-react";
import type { Listing } from "@/src/lib/fabrication";
import { formatCurrency, sizeRequirementLabel } from "@/src/lib/fabrication";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="card listing-card overflow-hidden">
      <a href={`/listings/${listing.slug}`} className="listing-card__media" aria-label={`View ${listing.title}`}>
        <img src={listing.photoUrls[0]} alt="" className="h-56 w-full object-cover" />
        <span className="listing-card__badge">{sizeRequirementLabel(listing.sizeSqft)}</span>
      </a>
      <div className="listing-card__body">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-hazard">Available workspace</p>
            <h3 className="mt-1 text-xl font-black leading-tight">{listing.title}</h3>
            <p className="mt-1 text-sm font-bold text-steel">{listing.address}</p>
          </div>
          <span className="status-pill border-ink bg-safety text-ink">{listing.zoning}</span>
        </div>
        <div className="listing-card__specs">
          <span className="listing-card__spec">
            <Ruler size={16} /> {listing.sizeSqft} sqft
          </span>
          <span className="listing-card__spec">
            <Bolt size={16} /> {listing.powerType === "THREE_PHASE" ? "3-phase" : "1-phase"}
          </span>
          <span className="listing-card__spec">
            <Truck size={16} /> Loading
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-neutral-200 pt-4">
          <div>
            <p className="text-xs font-bold uppercase text-steel">From</p>
            <p className="text-2xl font-black">{formatCurrency(listing.prices.day)}/day</p>
            <p className="text-sm font-bold text-steel">{formatCurrency(listing.prices.thirtyDays)}/30 days</p>
          </div>
          <a href={`/listings/${listing.slug}`} className="button-dark">
            View details <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </article>
  );
}
