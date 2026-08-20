import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { assertAuthenticationConfigured, getAppMode, isDemoMode } from "@/src/lib/app-mode";
import { DEMO_SESSION_COOKIE } from "@/src/lib/authorization";
import { isAvailableWhileLaunchPaused, isPublicLaunchEnabled, launchPausedResponse } from "@/src/lib/public-launch";
import { gatePageRequest } from "@/src/lib/request-gate";

const managedAuthentication = clerkMiddleware(async (auth, request) => {
  const session = await auth();
  return (await gatePageRequest(request, { kind: "managed", providerUserId: session.userId })) ?? undefined;
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const requestWithId = new NextRequest(request, { headers });
  const mode = getAppMode();
  if (!isPublicLaunchEnabled(process.env, mode) && !isAvailableWhileLaunchPaused(request.nextUrl.pathname)) {
    const response = launchPausedResponse();
    response.headers.set("x-request-id", requestId);
    return response;
  }
  if (isDemoMode()) {
    const denied = await gatePageRequest(requestWithId, { kind: "demo", userId: request.cookies.get(DEMO_SESSION_COOKIE)?.value ?? null });
    if (denied) {
      denied.headers.set("x-request-id", requestId);
      return denied;
    }
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
    "/favicon.ico"
  ]
};
