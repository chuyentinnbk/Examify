import Redis, { RedisOptions } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

const getRedisConfiguration = (): RedisOptions => {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  return {
    host,
    port,
    password,
    db,
    lazyConnect: true,
    connectTimeout: 2000,
    commandTimeout: 2000,
    enableOfflineQueue: false, // Don't buffer commands indefinitely when disconnected
    maxRetriesPerRequest: 1,   // Fail fast to prevent hanging HTTP requests
    retryStrategy(times) {
      if (times > 5) {
        // Stop reconnecting aggressively if unreachable, retry every 10s
        return 10000;
      }
      return Math.min(times * 500, 3000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.some((target) => err.message.includes(target));
    },
  };
};

export const createRedisClient = (): Redis => {
  const options = getRedisConfiguration();
  
  // Parse REDIS_URL if provided, otherwise use options object
  let client: Redis;
  if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis://')) {
    client = new Redis(process.env.REDIS_URL, options);
  } else {
    client = new Redis(options);
  }

  client.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ [Redis] Connection established successfully');
    }
  });

  client.on('error', (err) => {
    // Log concisely without throwing unhandled rejections
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Redis] Offline or unreachable (${err.message}). System using safe fallback.`);
    }
  });

  return client;
};

export const redis: Redis = globalForRedis.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

// ------------------------------------------------------------------------------
// Key Namespace Helpers
// ------------------------------------------------------------------------------

export const REDIS_KEYS = {
  // System initialization state cache (TTL: 5 mins or invalidated on setup)
  SYSTEM_INITIALIZED: 'examify:system:is_initialized',

  // User session: examify:session:<token> -> JSON string { userId, email, role, ... }
  SESSION: (token: string) => `examify:session:${token}`,

  // Rate Limiting Sliding Window: examify:ratelimit:<ip>:<routePrefix>
  RATE_LIMIT: (ip: string, route: string) => `examify:ratelimit:${ip}:${route}`,

  // Active generation locks to prevent duplicate concurrent spamming
  EXAM_LOCK: (teacherId: string) => `examify:lock:exam_gen:${teacherId}`,

  // Blacklisted/Revoked JWT tokens
  TOKEN_BLACKLIST: (token: string) => `examify:blacklist:${token}`,
};

export default redis;
