import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="section-shell py-16">
      <section className="card mx-auto max-w-xl p-8 text-center">
        <p className="text-sm font-black uppercase text-hazard">401 - Sign in required</p>
        <h1 className="mt-2 text-3xl font-black">This area is private</h1>
        <p className="mt-3 font-bold text-steel">Sign in with the account that owns this workspace, booking, or conversation.</p>
        <Link className="button-primary mt-6 inline-flex" href="/sign-in">Sign in</Link>
      </section>
    </main>
  );
}
