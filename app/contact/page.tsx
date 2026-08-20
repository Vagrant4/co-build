import { Mail } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { sendContactInquiryAction } from "./actions";

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
            <Mail className="text-hazard" size={20} /> support@spaceoncall.com
          </p>
        </div>
      </section>
      <ActionForm action={sendContactInquiryAction} className="card grid gap-4 p-6">
        <label>
          <span className="label">Name</span>
          <input className="field" name="name" placeholder="Your name" required />
        </label>
        <label>
          <span className="label">Email</span>
          <input className="field" name="email" type="email" placeholder="you@example.com" required />
        </label>
        <label>
          <span className="label">Topic</span>
          <select className="field" name="topic">
            <option>Rent a space</option>
            <option>List a space</option>
            <option>High-risk work approval</option>
            <option>Deposit or dispute</option>
          </select>
        </label>
        <label>
          <span className="label">Message</span>
          <textarea className="field min-h-36" name="message" maxLength={2000} placeholder="Tell us what you need." required />
        </label>
        <SubmitButton pendingLabel="Sending enquiry...">Send inquiry</SubmitButton>
      </ActionForm>
    </main>
  );
}
