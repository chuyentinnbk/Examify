export interface EdgeRateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export interface EdgeRateLimitResult {
  isAllowed: boolean;
  limit: number;
  currentCount: number;
  remaining: number;
  resetTimeMs: number;
}

// In-memory sliding window cache for Edge runtime instances
const edgeRequestLogs = new Map<string, number[]>();

export class EdgeRateLimiter {
  /**
   * Evaluates rate limiting in Edge runtime using an in-memory sliding window log.
   */
  public static check(
    identifier: string,
    routeKey = 'default',
    config: EdgeRateLimitConfig = { windowSeconds: 60, maxRequests: 120 }
  ): EdgeRateLimitResult {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;
    const key = `${identifier}:${routeKey}`;

    let timestamps = edgeRequestLogs.get(key) || [];

    // Filter out timestamps older than the sliding window
    timestamps = timestamps.filter((t) => t > windowStart);
    timestamps.push(now);

    edgeRequestLogs.set(key, timestamps);

    // Periodic cleanup of stale keys
    if (edgeRequestLogs.size > 5000) {
      for (const [k, ts] of edgeRequestLogs.entries()) {
        if (ts.every((t) => t <= windowStart)) {
          edgeRequestLogs.delete(k);
        }
      }
    }

    const currentCount = timestamps.length;
    const isAllowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTimeMs = now + windowMs;

    return {
      isAllowed,
      limit: config.maxRequests,
      currentCount,
      remaining,
      resetTimeMs,
    };
  }
}
