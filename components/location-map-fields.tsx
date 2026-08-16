"use client";

import { MapPin, Navigation } from "lucide-react";
import { useState } from "react";

type LocationMapFieldsProps = {
  defaultLocation: string;
  defaultAddress: string;
};

export function LocationMapFields({ defaultLocation, defaultAddress }: LocationMapFieldsProps) {
  const [location, setLocation] = useState(defaultLocation);
  const [address, setAddress] = useState(defaultAddress);
  const [mapQuery, setMapQuery] = useState("");
  const mapUrl = mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : "";

  function updateMap() {
    setMapQuery([address.trim(), location.trim()].filter(Boolean).join(", "));
  }

  return (
    <>
      <label>
        <span className="label">Location</span>
        <input
          className="field"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="City, area, or district"
          required
        />
      </label>
      <label>
        <span className="label">Address</span>
        <input
          className="field"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Full street address and unit number"
          required
        />
      </label>
      <section className="md:col-span-2" aria-label="Location map preview">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label mb-0">Location map</span>
          <button className="button-secondary min-h-10 px-3 py-2" type="button" onClick={updateMap} disabled={!address.trim() && !location.trim()}>
            <Navigation size={14} aria-hidden="true" /> Check location
          </button>
        </div>
        <div className="overflow-hidden border border-neutral-300 bg-white">
          {mapUrl ? (
            <iframe
              className="h-80 w-full border-0"
              src={mapUrl}
              title="Listing location map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="grid min-h-52 place-items-center p-6 text-center">
              <div>
                <MapPin className="mx-auto text-hazard" size={30} aria-hidden="true" />
                <p className="mt-3 font-black">Enter the actual address, then select Check location.</p>
                <p className="mt-1 text-sm font-bold text-steel">Confirm that the map marker is at the correct entrance before submitting.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
