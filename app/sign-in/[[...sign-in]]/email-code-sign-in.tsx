"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { KeyRound, LoaderCircle, Mail } from "lucide-react";

type ClerkError = { errors?: Array<{ longMessage?: string; message?: string }> };

function safeError(error: unknown): string {
  const clerkError = error as ClerkError;
  return clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "Sign-in could not be completed.";
}

export function EmailCodeSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function sendCode() {
    if (!signIn) throw new Error("Sign-in is not ready.");
    const result = await signIn.create({ identifier: email.trim() });
    const factor = result.supportedFirstFactors?.find(
      (item) => item.strategy === "email_code" && "emailAddressId" in item
    );

    if (!factor || !("emailAddressId" in factor)) {
      throw new Error("Email-code sign-in is unavailable for this account.");
    }

    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId
    });
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn || !email.trim()) return;

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await sendCode();
      setStage("code");
      setResendCooldown(30);
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (!isLoaded || !signIn || resendCooldown > 0) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await sendCode();
      setCode("");
      setNotice("A new verification code was sent. Older codes will no longer work.");
      setResendCooldown(30);
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn || !setActive || !code.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error("Additional verification is required for this account.");
      }

      await setActive({ session: result.createdSessionId });
      window.location.assign("/create-account");
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel w-full max-w-md p-6 sm:p-8">
      <p className="eyebrow">Secure account access</p>
      <h1 className="mt-2 text-3xl font-black">Sign in to SpaceOnCall</h1>
      <p className="mt-3 text-sm text-zinc-400">Use the email address registered to your renter or host account.</p>

      {stage === "email" ? (
        <form className="mt-7 space-y-4" onSubmit={requestCode}>
          <label className="block">
            <span className="label">Email address</span>
            <div className="mt-2 flex items-center gap-3 border border-zinc-700 bg-black/30 px-3">
              <Mail className="text-orange-500" size={18} />
              <input
                className="min-h-12 w-full bg-transparent outline-none"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>
          <button className="button-primary w-full justify-center" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Mail size={18} />}
            Email me a sign-in code
          </button>
        </form>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={verifyCode}>
          <p className="text-sm text-zinc-300">A one-time code was sent to <strong>{email}</strong>.</p>
          <label className="block">
            <span className="label">Verification code</span>
            <div className="mt-2 flex items-center gap-3 border border-zinc-700 bg-black/30 px-3">
              <KeyRound className="text-orange-500" size={18} />
              <input
                className="min-h-12 w-full bg-transparent text-lg tracking-widest outline-none"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </div>
          </label>
          <button className="button-primary w-full justify-center" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
            Verify and sign in
          </button>
          <button
            className="button-secondary w-full justify-center"
            type="button"
            onClick={resendCode}
            disabled={submitting || resendCooldown > 0}
          >
            <Mail size={18} />
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
          </button>
          <button className="button-secondary w-full justify-center" type="button" onClick={() => { setStage("email"); setCode(""); setError(""); }}>
            Use a different email
          </button>
        </form>
      )}

      {error ? <p className="mt-4 border-l-2 border-red-500 pl-3 text-sm text-red-300" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 border-l-2 border-emerald-500 pl-3 text-sm text-emerald-300" role="status">{notice}</p> : null}
      <p className="mt-6 text-xs text-zinc-500">Administrator access uses the separate private admin portal.</p>
    </section>
  );
}
