"use client";

import { ClerkLoaded, ClerkLoading, SignIn, SignOutButton } from "@clerk/nextjs";
import { LoaderCircle, LogOut } from "lucide-react";

export function AdminAuthPanel({ signedIn, eligibleEmail }: { signedIn: boolean; eligibleEmail?: string }) {
  return (
    <div className="admin-auth-page__auth-shell">
      <ClerkLoading>
        <div className="admin-auth-page__message">
          <LoaderCircle className="animate-spin text-hazard" size={25} />
          <p className="admin-auth-page__label">Secure connection</p>
          <h2>Loading administrator sign-in</h2>
          <p>Connecting to the managed identity service. No renter or host registration is required.</p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
      {signedIn ? (
      <div className="admin-auth-page__message">
        <p className="admin-auth-page__label">Different account required</p>
        <h2>This identity is not an administrator</h2>
        <p>Sign out, then use the verified administrator email. Public renter and host accounts cannot enter the operations console.</p>
        <SignOutButton redirectUrl="/admin/sign-in">
          <button className="admin-auth-page__button" type="button"><LogOut size={18} /> Sign out and continue</button>
        </SignOutButton>
      </div>
      ) : (
      <div>
      {eligibleEmail ? <p className="admin-auth-page__hint">Authorized administrator: {eligibleEmail}</p> : null}
      <SignIn routing="path" path="/admin/sign-in" forceRedirectUrl="/admin/sign-in" signUpUrl="/create-account" />
      </div>
      )}
      </ClerkLoaded>
    </div>
  );
}
