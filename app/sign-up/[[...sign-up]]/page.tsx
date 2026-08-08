import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/src/lib/app-mode";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (isDemoMode()) redirect("/demo");
  return <main className="section-shell flex min-h-[70vh] items-center justify-center py-10"><SignUp forceRedirectUrl="/create-account" /></main>;
}
