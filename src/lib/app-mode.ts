export const APP_MODES = ["demo", "pilot", "production"] as const;

export type AppMode = (typeof APP_MODES)[number];

export function getAppMode(environment: NodeJS.ProcessEnv = process.env): AppMode {
  const value = environment.APP_MODE;
  if (value) {
    if (APP_MODES.includes(value as AppMode)) return value as AppMode;
    throw new Error(`Invalid APP_MODE: ${value}. Expected demo, pilot, or production.`);
  }
  if (environment.NODE_ENV === "test" || environment.NODE_ENV === "development") return "demo";
  throw new Error("APP_MODE must be explicitly set to demo, pilot, or production.");
}

export function assertAuthenticationConfigured(environment: NodeJS.ProcessEnv = process.env): void {
  const mode = getAppMode(environment);
  if (mode === "demo") return;

  const missing = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].filter((key) => !environment[key]);
  if (missing.length) {
    throw new Error(`${mode} mode requires managed authentication configuration: ${missing.join(", ")}`);
  }
}

export function isDemoMode(environment: NodeJS.ProcessEnv = process.env): boolean {
  return getAppMode(environment) === "demo";
}
