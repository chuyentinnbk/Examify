import redis, { REDIS_KEYS } from '@/lib/redis';

export interface RateLimitConfig {
  windowSeconds: number; // e.g. 60 seconds
  maxRequests: number;   // e.g. 100 requests per window
}

export interface RateLimitResult {
  isAllowed: boolean;
  limit: number;
  currentCount: number;
  remaining: number;
  resetTimeMs: number;
}

export class SlidingWindowRateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  };

  /**
   * Evaluates request allowance using a Redis Sliding Window Log.
   *
   * @param identifier - Unique client ID (Client IP, User ID, or API Key)
   * @param routeKey   - Logical route partition (e.g. "api_exams", "auth_login", "global")
   * @param customConfig - Optional override of default window/rate limits
   */
  public static async check(
    identifier: string,
    routeKey = 'default',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const config: RateLimitConfig = {
      ...this.DEFAULT_CONFIG,
      ...customConfig,
    };

    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;
    const redisKey = REDIS_KEYS.RATE_LIMIT(identifier, routeKey);

    try {
      // Execute atomic transaction pipeline:
      // 1. Remove timestamps outside the sliding window
      // 2. Add current request timestamp (using unique timestamp + random suffix as member)
      // 3. Count total active requests in the current window
      // 4. Reset key TTL to ensure zero orphan memory retention
      const member = `${now}:${Math.random().toString(36).substring(2, 8)}`;

      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zadd(redisKey, now, member);
      pipeline.zcard(redisKey);
      pipeline.expire(redisKey, config.windowSeconds * 2);

      const results = await pipeline.exec();

      // Results: [[null, removedCount], [null, addedCount], [null, currentCount], [null, expireRes]]
      const currentCount = (results?.[2]?.[1] as number) || 1;
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
    } catch (error) {
      console.error('⚠️ [RateLimiter] Redis error, failing open for safety:', error);
      // Fallback: If Redis is temporarily unreachable, allow request to avoid blocking valid traffic
      return {
        isAllowed: true,
        limit: config.maxRequests,
        currentCount: 1,
        remaining: config.maxRequests - 1,
        resetTimeMs: now + windowMs,
      };
    }
  }
}
