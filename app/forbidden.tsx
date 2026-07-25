import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="section-shell py-16">
      <section className="card mx-auto max-w-xl p-8 text-center">
        <p className="text-sm font-black uppercase text-hazard">403 - Access denied</p>
        <h1 className="mt-2 text-3xl font-black">This account cannot open that area</h1>
        <p className="mt-3 font-bold text-steel">Use an authorized renter, host, or administrator account.</p>
        <Link className="button-secondary mt-6 inline-flex" href="/">Return home</Link>
      </section>
    </main>
  );
}
