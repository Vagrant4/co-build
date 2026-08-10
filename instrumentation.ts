import * as Sentry from "@sentry/nextjs";

const sharedConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0
};

export async function register() {
  Sentry.init(sharedConfig);
}

export const onRequestError = Sentry.captureRequestError;
