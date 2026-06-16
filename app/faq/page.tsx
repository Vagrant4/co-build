const faqs = [
  ["Who is this for?", "Small fabricators, contractors, makers, hardware startups, signage makers, furniture makers, e-commerce operators, and project teams."],
  ["What durations are supported?", "The MVP supports 1 day, 7 days, 30 days, and 60 days."],
  ["What happens to high-risk work?", "Hot work, welding, spray painting, chemical work, and factory-type mismatches require admin approval before payment."],
  ["Does checkout charge real money?", "No. The MVP records demo Stripe checkout until live Stripe keys are connected, while still calculating rental, deposit, cleaning fee, and add-ons."],
  ["Are check-in and check-out photos required?", "Yes. They are stored with the booking for deposit and dispute review."]
];

export default function FaqPage() {
  return (
    <main className="section-shell py-10">
      <p className="text-sm font-black uppercase text-hazard">FAQ</p>
      <h1 className="mt-2 text-4xl font-black">Short-term fabrication rental questions</h1>
      <div className="mt-8 grid gap-4">
        {faqs.map(([question, answer]) => (
          <section key={question} className="border border-neutral-300 bg-white p-5">
            <h2 className="text-xl font-black">{question}</h2>
            <p className="mt-2 font-bold text-steel">{answer}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
