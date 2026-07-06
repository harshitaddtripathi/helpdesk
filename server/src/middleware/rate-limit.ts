import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  skip?: (req: Request) => boolean;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    if (options.skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${options.keyPrefix}:${getClientIp(req)}`;
    const bucket = getBucket(buckets, key, now, options.windowMs);
    bucket.count += 1;

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS"
});

function getBucket(
  buckets: Map<string, Bucket>,
  key: string,
  now: number,
  windowMs: number
) {
  const existingBucket = buckets.get(key);

  if (existingBucket && existingBucket.resetAt > now) {
    return existingBucket;
  }

  const bucket = {
    count: 0,
    resetAt: now + windowMs
  };

  buckets.set(key, bucket);
  pruneExpiredBuckets(buckets, now);
  return bucket;
}

function pruneExpiredBuckets(buckets: Map<string, Bucket>, now: number) {
  if (buckets.size < 1000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function getClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}
