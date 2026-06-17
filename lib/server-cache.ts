import { createHash } from "crypto";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

type CacheOptions = {
  key: string;
  ttlMs: number;
  tags?: string[];
};

type RedisPipelineResult<T = unknown> = {
  result?: T;
  error?: string;
};

type CacheStats = {
  startedAt: number;
  hits: number;
  misses: number;
  memoryHits: number;
  redisHits: number;
  writes: number;
  invalidations: number;
  bypasses: number;
  errors: number;
  lastErrorAt: number | null;
};

type ResQFoodCacheGlobal = typeof globalThis & {
  __resqFoodMemoryCache?: Map<string, CacheRecord<unknown>>;
  __resqFoodCacheVersions?: Map<string, number>;
  __resqFoodCacheStats?: CacheStats;
};

const globalForCache = globalThis as ResQFoodCacheGlobal;
const memoryCache =
  globalForCache.__resqFoodMemoryCache ?? new Map<string, CacheRecord<unknown>>();
const memoryVersions =
  globalForCache.__resqFoodCacheVersions ?? new Map<string, number>();
const cacheStats =
  globalForCache.__resqFoodCacheStats ??
  ({
    startedAt: Date.now(),
    hits: 0,
    misses: 0,
    memoryHits: 0,
    redisHits: 0,
    writes: 0,
    invalidations: 0,
    bypasses: 0,
    errors: 0,
    lastErrorAt: null,
  } satisfies CacheStats);

globalForCache.__resqFoodMemoryCache = memoryCache;
globalForCache.__resqFoodCacheVersions = memoryVersions;
globalForCache.__resqFoodCacheStats = cacheStats;

function incrementCacheStat(name: keyof Omit<CacheStats, "startedAt" | "lastErrorAt">) {
  cacheStats[name] += 1;
}

function recordCacheError() {
  cacheStats.errors += 1;
  cacheStats.lastErrorAt = Date.now();
}

function envFlagIsFalse(value: string | undefined) {
  return value ? ["0", "false", "off", "no"].includes(value.toLowerCase()) : false;
}

function getCacheTimeoutMs() {
  const parsed = Number(process.env.CACHE_FETCH_TIMEOUT_MS);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 700;
}

function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN;

  if (!url || !token || envFlagIsFalse(process.env.CACHE_ENABLED)) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    token,
  };
}

function buildCacheKey(input: unknown) {
  return `resqfood:cache:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}

function buildTagVersionKey(tag: string) {
  return `resqfood:cache-version:${tag}`;
}

async function redisPipeline<T = unknown>(
  commands: unknown[][],
): Promise<Array<RedisPipelineResult<T>>> {
  const config = getRedisConfig();

  if (!config) {
    throw new Error("Redis cache is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getCacheTimeoutMs());

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Redis cache request failed with ${response.status}.`);
    }

    const data = (await response.json()) as Array<RedisPipelineResult<T>>;

    if (!Array.isArray(data)) {
      throw new Error("Redis cache response is invalid.");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function redisGet(key: string) {
  const [result] = await redisPipeline<string | null>([["GET", key]]);

  if (result?.error) {
    throw new Error(result.error);
  }

  return typeof result?.result === "string" ? result.result : null;
}

async function redisSet(key: string, value: string, ttlMs: number) {
  await redisPipeline([["SET", key, value, "EX", Math.max(1, Math.ceil(ttlMs / 1000))]]);
}

async function getTagVersions(tags: string[]) {
  if (tags.length === 0) {
    return {};
  }

  const fallback = Object.fromEntries(
    tags.map((tag) => [tag, memoryVersions.get(tag) ?? 0]),
  );

  if (!getRedisConfig()) {
    return fallback;
  }

  try {
    const results = await redisPipeline<string | number | null>(
      tags.map((tag) => ["GET", buildTagVersionKey(tag)]),
    );

    return Object.fromEntries(
      tags.map((tag, index) => {
        const rawValue = results[index]?.result;
        const version = Number(rawValue ?? 0);

        return [tag, Number.isFinite(version) ? version : 0];
      }),
    );
  } catch (error) {
    console.warn("Redis cache tag lookup failed; using memory cache", error);
    return fallback;
  }
}

function getMemoryValue<T>(key: string) {
  const record = memoryCache.get(key) as CacheRecord<T> | undefined;

  if (!record) {
    return { hit: false as const };
  }

  if (Date.now() > record.expiresAt) {
    memoryCache.delete(key);
    return { hit: false as const };
  }

  return { hit: true as const, value: record.value };
}

function setMemoryValue<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getCachedJson<T>(
  options: CacheOptions,
  loader: () => Promise<T>,
) {
  if (options.ttlMs <= 0 || envFlagIsFalse(process.env.CACHE_ENABLED)) {
    incrementCacheStat("bypasses");
    return loader();
  }

  const tags = options.tags ?? [];
  const tagVersions = await getTagVersions(tags);
  const cacheKey = buildCacheKey({
    key: options.key,
    tagVersions,
  });
  const memoryHit = getMemoryValue<T>(cacheKey);

  if (memoryHit.hit) {
    incrementCacheStat("hits");
    incrementCacheStat("memoryHits");
    return memoryHit.value;
  }

  if (getRedisConfig()) {
    try {
      const rawValue = await redisGet(cacheKey);

      if (rawValue) {
        const parsed = JSON.parse(rawValue) as CacheRecord<T>;

        if (Date.now() <= parsed.expiresAt) {
          setMemoryValue(cacheKey, parsed.value, options.ttlMs);
          incrementCacheStat("hits");
          incrementCacheStat("redisHits");
          return parsed.value;
        }
      }
    } catch (error) {
      recordCacheError();
      console.warn("Redis cache read failed; loading fresh data", error);
    }
  }

  incrementCacheStat("misses");
  const value = await loader();
  setMemoryValue(cacheKey, value, options.ttlMs);
  incrementCacheStat("writes");

  if (getRedisConfig()) {
    try {
      await redisSet(
        cacheKey,
        JSON.stringify({ value, expiresAt: Date.now() + options.ttlMs }),
        options.ttlMs,
      );
    } catch (error) {
      recordCacheError();
      console.warn("Redis cache write failed", error);
    }
  }

  return value;
}

export async function invalidateCacheTags(tags: string[]) {
  const uniqueTags = Array.from(new Set(tags.filter(Boolean)));

  for (const tag of uniqueTags) {
    memoryVersions.set(tag, (memoryVersions.get(tag) ?? 0) + 1);
  }
  cacheStats.invalidations += uniqueTags.length;

  if (!getRedisConfig() || uniqueTags.length === 0) {
    return;
  }

  try {
    await redisPipeline(uniqueTags.map((tag) => ["INCR", buildTagVersionKey(tag)]));
  } catch (error) {
    recordCacheError();
    console.warn("Redis cache invalidation failed", error);
  }
}

export function getCacheStatus() {
  const observedRequests = cacheStats.hits + cacheStats.misses;
  const hitRatio =
    observedRequests > 0
      ? Number((cacheStats.hits / observedRequests).toFixed(4))
      : 0;
  const enabled = !envFlagIsFalse(process.env.CACHE_ENABLED);
  const redisConfigured = Boolean(getRedisConfig());

  return {
    enabled,
    redisConfigured,
    driver: enabled ? (redisConfigured ? "redis" : "memory") : "disabled",
    memoryEntries: memoryCache.size,
    memoryVersionTags: memoryVersions.size,
    stats: {
      startedAt: new Date(cacheStats.startedAt).toISOString(),
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRatio,
      memoryHits: cacheStats.memoryHits,
      redisHits: cacheStats.redisHits,
      writes: cacheStats.writes,
      invalidations: cacheStats.invalidations,
      bypasses: cacheStats.bypasses,
      errors: cacheStats.errors,
      lastErrorAt: cacheStats.lastErrorAt
        ? new Date(cacheStats.lastErrorAt).toISOString()
        : null,
    },
  };
}
