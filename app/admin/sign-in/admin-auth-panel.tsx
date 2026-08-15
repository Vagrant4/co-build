"use client";

import { useState, type FormEvent } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, LogOut, UserRound } from "lucide-react";

type ClerkError = { errors?: Array<{ longMessage?: string; message?: string }> };

function safeSignInError(error: unknown): string {
  const clerkError = error as ClerkError;
  const message = clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message;
  return message || "The administrator ID or password is incorrect.";
}

export function AdminAuthPanel({
  signedIn,
  authenticationIdentifier
}: {
  signedIn: boolean;
  authenticationIdentifier: string;
}) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetStage, setResetStage] = useState<"idle" | "code-sent">("idle");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [secondFactorRequired, setSecondFactorRequired] = useState(false);
  const [secondFactorCode, setSecondFactorCode] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isLoaded || !signIn || !setActive || !loginId.trim()) {
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

  async function startPasswordReset() {
    setError("");
    if (!isLoaded || !signIn || !loginId.trim()) {
      setError("Enter the administrator ID before requesting a reset code.");
      return;
    }

    setSubmitting(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: authenticationIdentifier
      });
      setPassword("");
      setResetStage("code-sent");
    } catch (caught) {
      setError(safeSignInError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function finishPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isLoaded || !signIn || !setActive) return;

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword
      });

      if (result.status === "needs_second_factor") {
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code"
        );
        if (!emailCodeFactor || !("emailAddressId" in emailCodeFactor)) {
          setError("Email verification is unavailable. Contact the operations owner.");
          return;
        }
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId
        });
        setPassword("");
        setSecondFactorRequired(true);
        return;
      }

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

  async function verifySecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isLoaded || !signIn || !setActive) return;

    setSubmitting(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: secondFactorCode
      });
      if (result.status !== "complete" || !result.createdSessionId) {
        setError("The administrator verification code could not be confirmed.");
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

  if (resetStage === "code-sent") {
    return (
      <form className="admin-auth-page__form" onSubmit={finishPasswordReset}>
        <p className="admin-auth-page__security-note">A reset code was sent to the authorized administrator email.</p>
        <div className="admin-auth-page__field">
          <label htmlFor="admin-reset-code"><KeyRound size={15} /> Reset code</label>
          <input id="admin-reset-code" inputMode="numeric" autoComplete="one-time-code" value={resetCode} onChange={(event) => setResetCode(event.target.value)} required />
        </div>
        <div className="admin-auth-page__field">
          <label htmlFor="admin-new-password"><LockKeyhole size={15} /> New password</label>
          <div className="admin-auth-page__password-control">
            <input id="admin-new-password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} />
            <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? "Hide new password" : "Show new password"} title={showNewPassword ? "Hide password" : "Show password"}>
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error ? <p className="admin-auth-page__error" role="alert">{error}</p> : null}
        <button className="admin-auth-page__button" type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
          {submitting ? "Resetting..." : "Reset password and sign in"}
        </button>
        <button className="admin-auth-page__button admin-auth-page__button--secondary" type="button" onClick={() => { setResetStage("idle"); setError(""); }}>
          Back to sign in
        </button>
      </form>
    );
  }

  if (secondFactorRequired) {
    return (
      <form className="admin-auth-page__form" onSubmit={verifySecondFactor}>
        <p className="admin-auth-page__security-note">A sign-in code was sent to the authorized administrator email.</p>
        <div className="admin-auth-page__field">
          <label htmlFor="admin-second-factor-code"><KeyRound size={15} /> Verification code</label>
          <input
            id="admin-second-factor-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={secondFactorCode}
            onChange={(event) => setSecondFactorCode(event.target.value)}
            required
          />
        </div>
        {error ? <p className="admin-auth-page__error" role="alert">{error}</p> : null}
        <button className="admin-auth-page__button" type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
          {submitting ? "Verifying..." : "Verify and open admin console"}
        </button>
        <button
          className="admin-auth-page__button admin-auth-page__button--secondary"
          type="button"
          onClick={() => { setSecondFactorRequired(false); setSecondFactorCode(""); setError(""); }}
          disabled={submitting}
        >
          Back to sign in
        </button>
      </form>
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
        <div className="admin-auth-page__password-control">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {error ? <p className="admin-auth-page__error" role="alert">{error}</p> : null}
      <button className="admin-auth-page__button" type="submit" disabled={!isLoaded || submitting}>
        {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}
        {submitting ? "Verifying..." : "Open admin console"}
      </button>
      <button className="admin-auth-page__button admin-auth-page__button--secondary" type="button" onClick={startPasswordReset} disabled={!isLoaded || submitting}>
        Send password reset code
      </button>
      <p className="admin-auth-page__security-note"><LockKeyhole size={14} /> Private access only. Credentials are verified by the managed identity service.</p>
    </form>
  );
}
