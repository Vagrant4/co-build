"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">SpaceOnCall</p>
          <h1 className="text-4xl font-black">Something went wrong</h1>
          <p className="text-neutral-300">The error has been recorded. Please try again.</p>
          <button className="w-fit bg-orange-500 px-5 py-3 font-bold text-black" onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
