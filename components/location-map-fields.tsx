"use client";

import { MapPin, Navigation, Route, Truck } from "lucide-react";
import { useState } from "react";

type LocationMapFieldsProps = {
  defaultLocation: string;
  defaultAddress: string;
};

export function LocationMapFields({ defaultLocation, defaultAddress }: LocationMapFieldsProps) {
  const [location, setLocation] = useState(defaultLocation);
  const [address, setAddress] = useState(defaultAddress);
  const displayLocation = location.trim() || "Location not set";
  const displayAddress = address.trim() || "Address not set";

  return (
    <>
      <label>
        <span className="label">Location</span>
        <input
          className="field"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Kranji, Tuas, Woodlands"
        />
      </label>
      <label>
        <span className="label">Address</span>
        <input
          className="field"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Industrial estate, street, unit"
        />
      </label>
      <section className="md:col-span-2" aria-label="Location map preview">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label mb-0">Location map</span>
          <span className="status-pill">
            <Navigation size={14} aria-hidden="true" />
            Map preview
          </span>
        </div>
        <div className="grid overflow-hidden border border-neutral-300 bg-white lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="relative min-h-72 overflow-hidden bg-[#ece9df]">
            <div className="industrial-grid absolute inset-0 opacity-70" />
            <div className="absolute left-[-8%] top-[45%] h-10 w-[120%] -rotate-6 border-y border-neutral-300 bg-white/85" />
            <div className="absolute left-[18%] top-[-12%] h-[125%] w-9 rotate-12 border-x border-neutral-300 bg-white/85" />
            <div className="absolute bottom-[12%] left-[-12%] h-7 w-[128%] rotate-3 bg-[#f5b400]/80" />
            <div className="absolute left-[12%] top-[16%] border border-neutral-300 bg-white/80 px-3 py-2 text-xs font-black uppercase text-steel">
              Factory cluster
            </div>
            <div className="absolute bottom-[18%] right-[10%] border border-neutral-300 bg-white/80 px-3 py-2 text-xs font-black uppercase text-steel">
              Loading road
            </div>
            <div className="absolute left-[50%] top-[37%] -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-hazard text-white shadow-xl">
                <MapPin size={28} aria-hidden="true" />
              </div>
              <div className="mt-2 max-w-60 border border-neutral-900 bg-white px-3 py-2 text-left shadow-lg">
                <p className="text-xs font-black uppercase text-hazard">{displayLocation}</p>
                <p className="mt-1 text-sm font-black">{displayAddress}</p>
              </div>
            </div>
          </div>
          <div className="grid content-between gap-4 border-t border-neutral-300 p-4 lg:border-l lg:border-t-0">
            <div>
              <p className="text-xs font-black uppercase text-hazard">Location check</p>
              <h2 className="mt-1 text-xl font-black">{displayLocation}</h2>
              <p className="mt-2 text-sm font-bold text-steel">{displayAddress}</p>
            </div>
            <div className="grid gap-2 text-sm font-bold text-steel">
              <div className="flex items-center gap-2 border border-neutral-200 p-2">
                <Truck size={16} className="text-hazard" aria-hidden="true" />
                Confirm loading access and driveway clearance
              </div>
              <div className="flex items-center gap-2 border border-neutral-200 p-2">
                <Route size={16} className="text-hazard" aria-hidden="true" />
                Share nearest entrance or unit instructions
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
