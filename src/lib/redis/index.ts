/**
 * TrustSeal Redis Caching Engine
 * Core Pillar 06: Real-Time WebSockets & Redis Cache
 *
 * Implements Cache-Aside strategy for high-throughput public QR verification.
 * Shields PostgreSQL from read connection exhaustion during viral verification spikes.
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// In-memory cache fallback for zero-dependency local development
const localCache = new Map<string, { value: string; expiresAt: number }>();

let redisClient: Redis | null = null;
let isRedisConnected = false;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    redisClient = new Redis(redisUrl, {
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null, // don't spam retry loops if offline
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ [Redis] Connected to Redis instance at', redisUrl);
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      // Silently fall back to in-memory cache
    });

    redisClient.connect().catch(() => {
      isRedisConnected = false;
    });

    return redisClient;
  } catch {
    return null;
  }
}

/**
 * Cache-Aside: Retrieve credential metadata
 */
export async function getCachedCredential<T>(id: string): Promise<T | null> {
  const key = `cert:${id}`;
  const r = getRedis();

  if (r && isRedisConnected) {
    try {
      const data = await r.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
    } catch {
      // Fall through to local cache
    }
  }

  // Check in-memory fallback cache
  const localItem = localCache.get(key);
  if (localItem) {
    if (Date.now() < localItem.expiresAt) {
      return JSON.parse(localItem.value) as T;
    }
    localCache.delete(key);
  }

  return null;
}

/**
 * Cache-Aside: Save credential to cache with Time-To-Live (TTL)
 */
export async function setCachedCredential<T>(
  id: string,
  data: T,
  ttlSeconds = 3600
): Promise<void> {
  const key = `cert:${id}`;
  const serialized = JSON.stringify(data);
  const r = getRedis();

  if (r && isRedisConnected) {
    try {
      await r.setex(key, ttlSeconds, serialized);
      return;
    } catch {
      // Fall through to local cache
    }
  }

  // Set in local cache
  localCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate cache entry on revocation or update
 */
export async function invalidateCredentialCache(id: string): Promise<void> {
  const key = `cert:${id}`;
  const r = getRedis();

  if (r && isRedisConnected) {
    try {
      await r.del(key);
    } catch {
      // Ignore
    }
  }
  localCache.delete(key);
}
