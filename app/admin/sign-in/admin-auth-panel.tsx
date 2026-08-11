"use client";

import { SignIn, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function AdminAuthPanel({ signedIn, eligibleEmail }: { signedIn: boolean; eligibleEmail?: string }) {
  if (signedIn) {
    return (
      <div className="admin-auth-page__message">
        <p className="admin-auth-page__label">Different account required</p>
        <h2>This identity is not an administrator</h2>
        <p>Sign out, then use the verified administrator email. Public renter and host accounts cannot enter the operations console.</p>
        <SignOutButton redirectUrl="/admin/sign-in">
          <button className="admin-auth-page__button" type="button"><LogOut size={18} /> Sign out and continue</button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <div>
      {eligibleEmail ? <p className="admin-auth-page__hint">Authorized administrator: {eligibleEmail}</p> : null}
      <SignIn routing="path" path="/admin/sign-in" forceRedirectUrl="/admin/sign-in" signUpUrl="/create-account" />
    </div>
  );
}
