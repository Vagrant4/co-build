import { formatCurrency } from "@/src/lib/fabrication";

const rows = [
  ["Smaller than 1,000 sqft", "State exact sqft required", "S$35-S$900/day", "S$550-S$10,000/month", "S$100-S$5,000"],
  ["Bigger than 1,000 sqft", "Quote and approval required", "Custom quote", "Custom quote", "Custom deposit"]
];

export function PricingTable() {
  return (
    <div className="border border-neutral-300 bg-white">
      <div className="grid gap-3 p-3 md:hidden">
        {rows.map(([size, stated, dayRate, monthly, deposit]) => (
          <article key={size} className="stripe-card border border-neutral-200 bg-white p-4">
            <h3 className="text-lg font-black">{size}</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="font-black uppercase text-steel">How it is stated</dt>
                <dd className="font-bold">{stated}</dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="font-black uppercase text-steel">Day rate</dt>
                  <dd className="font-bold">{dayRate}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-steel">Monthly</dt>
                  <dd className="font-bold">{monthly}</dd>
                </div>
              </div>
              <div>
                <dt className="font-black uppercase text-steel">Deposit</dt>
                <dd className="font-bold">{deposit}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-ink text-white">
            <tr>
              {["Size required", "How it is stated", "Day rate", "Monthly", "Deposit"].map((heading) => (
                <th key={heading} className="p-4 text-sm font-black uppercase">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-neutral-200">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className={`p-4 ${index === 0 ? "font-black" : "text-steel"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 border-t border-neutral-200 p-4 md:grid-cols-3">
        <div>
          <p className="text-sm font-bold uppercase text-steel">Project Day Pass</p>
          <p className="text-2xl font-black">{formatCurrency(120)}/day</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase text-steel">30-Day Fabricator Bay</p>
          <p className="text-2xl font-black">S$1,500-S$2,200</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase text-steel">60-Day Project Bay</p>
          <p className="text-2xl font-black">S$3,000-S$4,000</p>
        </div>
      </div>
    </div>
  );
}
