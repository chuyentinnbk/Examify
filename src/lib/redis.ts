import Redis, { RedisOptions } from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

export const isRedisConfigured = (): boolean => {
  if (process.env.REDIS_ENABLED === 'false') return false;
  const host = process.env.REDIS_HOST;
  if (!host || host === '' || host === 'disabled' || host === 'none') return false;
  return true;
};

// In-memory fallback mock when Redis is optional / disabled
class InMemoryRedisMock {
  private store = new Map<string, { val: string; expireAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expireAt && Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }
    return item.val;
  }

  async set(key: string, val: string, ...args: any[]): Promise<'OK'> {
    let expireAt: number | undefined;
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      expireAt = Date.now() + args[1] * 1000;
    }
    this.store.set(key, { val, expireAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, val: string): Promise<'OK'> {
    this.store.set(key, { val, expireAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  on(): this {
    return this;
  }

  pipeline() {
    const operations: Array<() => any> = [];
    const pipe = {
      zremrangebyscore: () => { operations.push(() => 0); return pipe; },
      zadd: () => { operations.push(() => 1); return pipe; },
      zcard: () => { operations.push(() => 1); return pipe; },
      expire: () => { operations.push(() => 1); return pipe; },
      exec: async () => operations.map((op) => [null, op()]),
    };
    return pipe;
  }
}

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
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // Stop reconnecting if unreachable
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.some((target) => err.message.includes(target));
    },
  };
};

export const createRedisClient = (): Redis => {
  // If Redis is not configured or disabled, use silent in-memory fallback
  if (!isRedisConfigured()) {
    return new InMemoryRedisMock() as unknown as Redis;
  }

  const options = getRedisConfiguration();
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

  client.on('error', () => {
    // Fail silently in development so console stays clean
  });

  return client;
};

export const redis: Redis = globalForRedis.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

export const REDIS_KEYS = {
  SYSTEM_INITIALIZED: 'examify:system:is_initialized',
  SESSION: (token: string) => `examify:session:${token}`,
  RATE_LIMIT: (ip: string, route: string) => `examify:ratelimit:${ip}:${route}`,
  EXAM_LOCK: (teacherId: string) => `examify:lock:exam_gen:${teacherId}`,
  TOKEN_BLACKLIST: (token: string) => `examify:blacklist:${token}`,
};

export default redis;
