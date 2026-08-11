import { Factory } from "lucide-react";
import { createListingAction } from "@/app/actions";
import { LocationMapFields } from "@/components/location-map-fields";
import { PrivateUploadField } from "@/components/private-upload-field";
import { requirePageRole } from "@/src/lib/page-authorization";
import { workTypes } from "@/src/lib/seed-data";

export const dynamic = "force-dynamic";

const accessStartTimes = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const accessEndTimes = Array.from({ length: 24 }, (_, index) => `${String(index + 1).padStart(2, "0")}:00`);

export default async function NewListingPage() {
  await requirePageRole("HOST");

  return (
    <main className="signal-page py-8">
      <div className="section-shell">
      <div className="mb-6">
        <p className="signal-kicker">Host listing form</p>
        <h1 className="flex items-center gap-3 text-4xl font-black">
          <Factory className="text-hazard" size={38} /> List fabrication space
        </h1>
        <p className="mt-2 max-w-3xl font-bold text-steel">
          Submitted spaces start as pending admin approval. Hosts declare exact square footage, type, access,
          allowed work, restricted work, available equipment, pricing, deposits, and cleaning rules.
        </p>
      </div>
      <form action={createListingAction} className="co-build-form grid gap-5">
        <FormSection id="location" number="1" title="Location" summary="Name the space and pin the access point renters need to find.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="title" label="Space name" />
            <LocationMapFields defaultLocation="" defaultAddress="" />
          </div>
        </FormSection>

        <FormSection id="space-access" number="2" title="Space & Access" summary="Declare the working area, factory type, and standard access hours.">
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
            <input type="hidden" name="powerType" value="SINGLE_PHASE" />
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <label>
                <span className="label">Access start time</span>
                <select className="field" name="accessStart" defaultValue="08:00">
                  {accessStartTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Access end time</span>
                <select className="field" name="accessEnd" defaultValue="20:00">
                  {accessEndTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
            </div>
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

        <FormSection id="equipment" number="4" title="Equipment" summary="State the equipment renters can use or request with this space.">
          <label>
            <span className="label">Available equipment</span>
            <textarea
              className="field min-h-32"
              name="equipmentOther"
              placeholder={"Enter one item per line, for example:\nWorkbench\nDrill\nMaterial storage"}
            />
          </label>
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

        <FormSection id="photos" number="6" title="Photos" summary="Upload up to eight workspace photos and one floor plan so renters understand the space before requesting it.">
          <div className="grid gap-4 md:grid-cols-2">
            <PrivateUploadField label="Workspace photos (up to 8)" name="photo" type="LISTING_PHOTO" accept="image/jpeg,image/png,image/webp" maxFiles={8} />
            <PrivateUploadField label="Floor plan" name="floorPlan" type="FLOOR_PLAN" accept="image/jpeg,image/png,application/pdf" />
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

function Input({ label, name, defaultValue = "", type = "text" }: { label: string; name: string; defaultValue?: string; type?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" name={name} defaultValue={defaultValue} type={type} required />
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
