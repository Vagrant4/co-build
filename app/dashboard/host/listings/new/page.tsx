import { Factory } from "lucide-react";
import { createListingAction } from "@/app/actions";
import { LocationMapFields } from "@/components/location-map-fields";
import { getEquipmentAddons } from "@/src/lib/repository";
import { workTypes } from "@/src/lib/seed-data";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const equipment = await getEquipmentAddons();

  return (
    <main className="signal-page py-8">
      <div className="section-shell">
      <div className="mb-6">
        <p className="signal-kicker">Host listing form</p>
        <h1 className="flex items-center gap-3 text-4xl font-black">
          <Factory className="text-hazard" size={38} /> List fabrication space
        </h1>
        <p className="mt-2 max-w-3xl font-bold text-steel">
          Submitted spaces start as pending admin approval. Hosts declare exact square footage, type, fire safety,
          electrical supply, allowed work, restricted work, availability, pricing, deposits, and cleaning rules.
        </p>
      </div>
      <form action={createListingAction} className="co-build-form grid gap-5">
        <FormSection id="location" number="1" title="Location" summary="Name the space and pin the access point renters need to find.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="title" label="Space name" defaultValue="Project Bay with Loading Access" />
            <LocationMapFields defaultLocation="Kranji" defaultAddress="Kranji Industrial Estate, Singapore" />
          </div>
        </FormSection>

        <FormSection id="space-access" number="2" title="Space & Access" summary="Declare the working area, factory type, electrical supply, access hours, and fire safety.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="sizeSqft" label="Available size in sqft" type="number" defaultValue="160" />
            <div role="group" aria-labelledby="listing-type-label" className="md:col-span-2">
              <span id="listing-type-label" className="label">
                Type
              </span>
              <div className="grid gap-2 md:grid-cols-4">
                <Checkbox name="factoryType" value="OFFICE" label="Office" />
                <Checkbox name="factoryType" value="B1" label="B1" defaultChecked />
                <Checkbox name="factoryType" value="B2" label="B2" />
                <Checkbox name="factoryType" value="OTHER" label="Other" />
                <label className="md:col-span-2">
                  <span className="label">Other type, state:</span>
                  <input className="field" name="factoryTypeOther" placeholder="State other space type" />
                </label>
              </div>
            </div>
            <label>
              <span className="label">Electrical supply</span>
              <input className="field" name="electricalSupply" defaultValue="Single-phase 240V with dedicated outlets" />
            </label>
            <label>
              <span className="label">Power type</span>
              <select className="field" name="powerType" defaultValue="SINGLE_PHASE">
                <option value="SINGLE_PHASE">Single-phase</option>
                <option value="THREE_PHASE">Three-phase</option>
              </select>
            </label>
            <Input name="accessHours" label="Access hours" defaultValue="8am-8pm daily" />
            <Input name="fireSafety" label="Fire safety equipment" defaultValue="Extinguishers and marked exit route" />
          </div>
        </FormSection>

        <FormSection id="work-rules" number="3" title="Work Rules" summary="Make permitted and restricted work clear before a renter books the space.">
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea name="loadingAccess" label="Loading access" defaultValue={"ramp\nlorry access"} />
            <Textarea name="amenities" label="Included amenities" defaultValue={"Workbench\nWi-Fi\nWaste bins\nShared sink"} />
            <Textarea name="permittedWork" label="Allowed work" defaultValue={workTypes.slice(0, 6).join("\n")} />
            <Textarea name="restrictedWork" label="Restricted work" defaultValue={"Spray painting, approval-only\nChemical work, approval-only"} />
          </div>
        </FormSection>

        <FormSection id="equipment" number="4" title="Equipment" summary="Select equipment renters can request as add-ons or included support.">
          <span className="label">Equipment available</span>
          <div className="grid gap-2 md:grid-cols-3">
            {equipment.map((addon) => (
              <label key={addon.slug} className="signal-checkbox flex items-center justify-between">
                {addon.name}
                <input type="checkbox" name="equipment" value={addon.slug} />
              </label>
            ))}
            <label className="signal-checkbox flex items-center justify-between">
              Other
              <input type="checkbox" name="equipment" value="other" />
            </label>
            <label className="md:col-span-2">
              <span className="label">State:</span>
              <input className="field" name="equipmentOther" placeholder="State other equipment available" />
            </label>
          </div>
        </FormSection>

        <FormSection id="pricing" number="5" title="Pricing" summary="Show day, week, month, project, deposit, high-risk, and cleaning rates at a glance.">
          <div className="grid gap-4 md:grid-cols-4">
            <Input name="priceDay" label="1-day price" type="number" defaultValue="150" />
            <Input name="priceSevenDays" label="7-day price" type="number" defaultValue="850" />
            <Input name="priceThirtyDays" label="30-day price" type="number" defaultValue="1800" />
            <Input name="priceSixtyDays" label="60-day price" type="number" defaultValue="3300" />
            <Input name="depositStandard" label="Deposit" type="number" defaultValue="800" />
            <Input name="depositHighRisk" label="High-risk extra deposit" type="number" defaultValue="400" />
            <Input name="cleaningFee" label="Cleaning fee" type="number" defaultValue="120" />
          </div>
        </FormSection>

        <FormSection id="photos" number="6" title="Photos" summary="Upload photos and a floor plan so renters understand the bay before requesting it.">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Photos</span>
              <input name="photo" type="file" accept="image/*" />
            </label>
            <label>
              <span className="label">Floor plan</span>
              <input name="floorPlan" type="file" accept="image/*,.pdf" />
            </label>
          </div>
          <div className="signal-submit mt-5 p-3">
            <button className="button-primary w-full bg-transparent shadow-none hover:shadow-none" type="submit">
              Submit for admin approval
            </button>
          </div>
        </FormSection>
      </form>
      </div>
    </main>
  );
}

function FormSection({
  id,
  number,
  title,
  summary,
  children
}: {
  id: string;
  number: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section data-form-section={id} className="co-build-section">
      <div className="co-build-section__header">
        <span className="co-build-section__number">{number}</span>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm font-bold text-steel">{summary}</p>
        </div>
      </div>
      <div className="co-build-section__body">{children}</div>
    </section>
  );
}

function Input({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" name={name} defaultValue={defaultValue} type={type} />
    </label>
  );
}

function Checkbox({
  label,
  name,
  value,
  defaultChecked = false
}: {
  label: string;
  name: string;
  value: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between border border-neutral-200 bg-white p-3 font-bold">
      {label}
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} />
    </label>
  );
}

function Textarea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <textarea className="field min-h-32" name={name} defaultValue={defaultValue} />
    </label>
  );
}
