import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/src/lib/app-mode";

export const dynamic = "force-dynamic";

type SignUpPageProps = { params: Promise<{ "sign-up"?: string[] }> | { "sign-up"?: string[] } };

export default async function SignUpPage({ params }: SignUpPageProps) {
  if (isDemoMode()) redirect("/demo");
  const route = await params;
  const verifyingEmail = route["sign-up"]?.includes("verify-email-address") ?? false;
  return (
    <main className="section-shell flex min-h-[70vh] flex-col items-center justify-center gap-6 py-10">
      <header className="max-w-lg text-center">
        <p className="text-sm font-black uppercase text-hazard">SpaceOnCall account</p>
        <h1 className="mt-2 text-4xl font-black">{verifyingEmail ? "Verify your email" : "Create your account"}</h1>
        <p className="mt-2 font-bold text-steel">
          {verifyingEmail ? "Enter the verification code sent to your email to continue." : "Register securely, verify your email, then choose a renter or host account."}
        </p>
      </header>
      <SignUp
        forceRedirectUrl="/create-account"
        appearance={{ elements: { card: "spaceoncall-clerk-card", headerTitle: "spaceoncall-clerk-title", headerSubtitle: "spaceoncall-clerk-subtitle" } }}
      />
    </main>
  );
}
