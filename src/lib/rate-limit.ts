import { createHash } from "node:crypto";
import { prisma } from "./db";

type RateLimitOptions = {
  action: string;
  identity: string;
  limit: number;
  windowSeconds: number;
};

export class RateLimitError extends Error {
  readonly status = 429;

  constructor() {
    super("Too many requests. Please wait and try again.");
    this.name = "RateLimitError";
  }
}

export async function enforceRateLimit(options: RateLimitOptions): Promise<void> {
  const now = new Date();
  const windowMs = options.windowSeconds * 1000;
  const windowStartedAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(windowStartedAt.getTime() + windowMs * 2);
  const keyHash = createHash("sha256").update(options.identity, "utf8").digest("hex");
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { keyHash_action_windowStartedAt: { keyHash, action: options.action, windowStartedAt } },
    create: { keyHash, action: options.action, windowStartedAt, expiresAt },
    update: { count: { increment: 1 }, expiresAt }
  });
  if (bucket.count > options.limit) throw new RateLimitError();
}

export async function deleteExpiredRateLimits(now = new Date()): Promise<number> {
  const result = await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}
