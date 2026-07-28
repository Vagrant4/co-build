const REDACTED_KEYS = /token|secret|password|email|mobile|address|body|content/i;

export function logEvent(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}): void {
  const safeFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, REDACTED_KEYS.test(key) ? "[redacted]" : value]));
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safeFields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function requestIdFrom(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}
