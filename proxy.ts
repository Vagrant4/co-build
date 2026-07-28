import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { assertAuthenticationConfigured, isDemoMode } from "@/src/lib/app-mode";

const managedAuthentication = clerkMiddleware();

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const requestWithId = new NextRequest(request, { headers });
  if (isDemoMode()) {
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("x-request-id", requestId);
    return response;
  }
  assertAuthenticationConfigured();
  const response = (await managedAuthentication(requestWithId, event)) || NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)"
  ]
};
