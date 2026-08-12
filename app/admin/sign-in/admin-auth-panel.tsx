"use client";

import { useState, type FormEvent } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { KeyRound, LoaderCircle, LockKeyhole, LogOut, UserRound } from "lucide-react";

type ClerkError = { errors?: Array<{ longMessage?: string; message?: string }> };

function safeSignInError(error: unknown): string {
  const clerkError = error as ClerkError;
  const message = clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message;
  return message || "The administrator ID or password is incorrect.";
}

export function AdminAuthPanel({
  signedIn,
  adminLoginId,
  authenticationIdentifier
}: {
  signedIn: boolean;
  adminLoginId: string;
  authenticationIdentifier: string;
}) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isLoaded || !signIn || !setActive || loginId.trim().toLowerCase() !== adminLoginId.toLowerCase()) {
      setError("The administrator ID or password is incorrect.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: authenticationIdentifier,
        password,
        strategy: "password"
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setError("Additional administrator verification is required. Contact the operations owner.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      window.location.assign("/dashboard/admin");
    } catch (caught) {
      setError(safeSignInError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (signedIn) {
    return (
      <div className="admin-auth-page__message">
        <p className="admin-auth-page__label">Administrator identity required</p>
        <h2>End the current session</h2>
        <p>A different account is active. Sign out before entering the private administrator console.</p>
        <SignOutButton redirectUrl="/admin/sign-in">
          <button className="admin-auth-page__button" type="button"><LogOut size={18} /> Sign out</button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <form className="admin-auth-page__form" onSubmit={submit}>
      <div className="admin-auth-page__field">
        <label htmlFor="admin-login-id"><UserRound size={15} /> Administrator ID</label>
        <input
          id="admin-login-id"
          name="adminLoginId"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          required
        />
      </div>
      <div className="admin-auth-page__field">
        <label htmlFor="admin-password"><LockKeyhole size={15} /> Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? <p className="admin-auth-page__error" role="alert">{error}</p> : null}
      <button className="admin-auth-page__button" type="submit" disabled={!isLoaded || submitting}>
        {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
        {submitting ? "Verifying..." : "Open admin console"}
      </button>
      <p className="admin-auth-page__security-note"><LockKeyhole size={14} /> Private access only. Credentials are verified by the managed identity service.</p>
    </form>
  );
}
