import { ArrowRight, Bolt, MapPin, Ruler, ShieldCheck, Truck } from "lucide-react";
import type { Listing } from "@/src/lib/fabrication";
import { formatArea, formatCurrency, sizeRequirementLabel } from "@/src/lib/fabrication";
import { isDummyListingSlug } from "@/src/lib/seed-data";

export function ListingCard({ listing }: { listing: Listing }) {
  const loadingLabel = listing.loadingAccess[0] ?? "Loading";
  const workPreview = listing.permittedWork.slice(0, 3);
  const isDummy = isDummyListingSlug(listing.slug);

  return (
    <article className="card listing-card overflow-hidden">
      <a href={`/listings/${listing.slug}`} className="listing-card__media" aria-label={`View ${listing.title}`}>
        <img src={listing.photoUrls[0]} alt={`${listing.title} workspace`} className="h-56 w-full object-cover" loading="lazy" />
        <span className="listing-card__signal">{isDummy ? "Unavailable" : "Available"}</span>
        <span className="listing-card__badge">{sizeRequirementLabel(listing.sizeSqft)}</span>
        <span className="listing-card__location">
          <MapPin size={14} /> {listing.location}
        </span>
      </a>
      <div className="listing-card__body">
        <div className="min-w-0">
          <h3 className="text-xl font-black leading-tight">{listing.title}</h3>
          <p className="mt-1 text-sm font-bold text-steel">{listing.address}</p>
        </div>
        <div className="listing-card__specs">
          <span className="listing-card__spec">
            <Ruler size={16} /> {formatArea(listing.sizeSqft)}
          </span>
          <span className="listing-card__spec">
            <Bolt size={16} /> {listing.powerType === "THREE_PHASE" ? "3-phase" : "1-phase"}
          </span>
          <span className="listing-card__spec">
            <Truck size={16} /> {loadingLabel}
          </span>
        </div>
        <div className="listing-card__work">
          {workPreview.map((work) => (
            <span key={work}>
              <ShieldCheck size={13} /> {work}
            </span>
          ))}
        </div>
        <div className="listing-card__price-row">
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
