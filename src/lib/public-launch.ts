import type { AppMode } from "./app-mode";

const ALWAYS_AVAILABLE_PATHS = [
  "/admin/sign-in",
  "/dashboard/admin",
  "/sign-in",
  "/sign-up",
  "/api/health",
  "/api/cron/maintenance",
  "/api/cron/provider-acceptance",
  "/api/ops/alerts",
  "/api/stripe/webhook",
  "/__clerk"
] as const;

export function isPublicLaunchEnabled(
  environment: NodeJS.ProcessEnv = process.env,
  mode: AppMode
): boolean {
  if (mode === "demo") return true;
  if (environment.PUBLIC_LAUNCH_ENABLED !== "true") return false;
  const approvedAt = environment.PUBLIC_LAUNCH_APPROVED_AT;
  const approvedSha = environment.PUBLIC_LAUNCH_APPROVED_SHA;
  const deployedSha = environment.VERCEL_GIT_COMMIT_SHA;
  return Boolean(
    approvedAt &&
    !Number.isNaN(Date.parse(approvedAt)) &&
    approvedSha &&
    deployedSha &&
    approvedSha === deployedSha
  );
}

export function isAvailableWhileLaunchPaused(pathname: string): boolean {
  return ALWAYS_AVAILABLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function launchPausedResponse(): Response {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Launch paused | SpaceOnCall</title><style>
    *{box-sizing:border-box}body{margin:0;background:#0d1011;color:#f5f6f5;font-family:Inter,"Segoe UI",Arial,sans-serif}main{display:grid;min-height:100vh;place-items:center;padding:1.5rem;background:linear-gradient(90deg,rgba(7,9,10,.97),rgba(7,9,10,.82)),url('/assets/spaceoncall-warehouse.webp') center/cover}.panel{width:min(100%,38rem);border:1px solid #353b3d;border-top:3px solid #ff5a1f;background:rgba(14,17,18,.97);padding:clamp(1.5rem,5vw,3rem);box-shadow:0 24px 70px rgba(0,0,0,.45)}.brand{font-size:1.35rem;font-weight:900}.brand em{color:#ff5a1f;font-style:normal}.status{margin:2.4rem 0 .55rem;color:#ff5a1f;font-size:.75rem;font-weight:900;text-transform:uppercase}h1{margin:0;font-size:clamp(2.2rem,8vw,4rem);line-height:1}p{margin:1.2rem 0 0;color:#bac0be;font-size:1.05rem;font-weight:650;line-height:1.65}.note{margin-top:2rem;border-top:1px solid #343a3c;padding-top:1.1rem;color:#858e8b;font-size:.86rem}
  </style></head><body><main><section class="panel"><div class="brand">Space<em>OnCall</em></div><p class="status">Private launch preparation</p><h1>Public access is paused.</h1><p>Registration, listings, bookings, and subscriptions are unavailable while final launch checks are completed.</p><p class="note">The operations team can continue using the protected administrator console.</p></section></main></body></html>`, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
