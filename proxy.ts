import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { assertAuthenticationConfigured, isDemoMode } from "@/src/lib/app-mode";

const managedAuthentication = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isDemoMode()) return NextResponse.next();
  assertAuthenticationConfigured();
  return managedAuthentication(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)"
  ]
};
