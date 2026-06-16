import { Mail, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="section-shell grid gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
      <section>
        <p className="text-sm font-black uppercase text-hazard">Contact</p>
        <h1 className="mt-2 text-4xl font-black">Talk to operations</h1>
        <p className="mt-4 font-bold text-steel">
          Use this MVP contact page for workshop owners, renter verification, high-risk work review, and deposit disputes.
        </p>
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 font-black">
            <Mail className="text-hazard" size={20} /> ops@fabbay.sg
          </p>
          <p className="flex items-center gap-2 font-black">
            <Phone className="text-hazard" size={20} /> +65 9000 0000
          </p>
        </div>
      </section>
      <form className="card grid gap-4 p-6">
        <label>
          <span className="label">Name</span>
          <input className="field" placeholder="Your name" />
        </label>
        <label>
          <span className="label">Email</span>
          <input className="field" type="email" placeholder="you@example.com" />
        </label>
        <label>
          <span className="label">Topic</span>
          <select className="field">
            <option>Rent a space</option>
            <option>List a space</option>
            <option>High-risk work approval</option>
            <option>Deposit or dispute</option>
          </select>
        </label>
        <label>
          <span className="label">Message</span>
          <textarea className="field min-h-36" placeholder="Tell us what you need." />
        </label>
        <button className="button-primary" type="button">
          Send inquiry
        </button>
      </form>
    </main>
  );
}
