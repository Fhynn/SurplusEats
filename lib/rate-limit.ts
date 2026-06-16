import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RateLimitRule = {
  keyPrefix: string;
  max: number;
  windowMs: number;
  message?: string;
  auditAction?: string;
};

type RateLimitAllowed = {
  allowed: true;
  limit: number;
  remaining: number;
  resetAt: Date;
};

type RateLimitBlocked = {
  allowed: false;
  limit: number;
  remaining: 0;
  resetAt: Date;
  retryAfterSeconds: number;
  response: NextResponse;
};

type RateLimitResult = RateLimitAllowed | RateLimitBlocked;

type MemoryRecord = {
  count: number;
  resetAt: number;
};

type RedisPipelineResult<T = unknown> = {
  result?: T;
  error?: string;
};

type RateLimitGlobal = typeof globalThis & {
  __resqFoodRateLimits?: Map<string, MemoryRecord>;
};

const globalForRateLimit = globalThis as RateLimitGlobal;
const memoryRateLimits =
  globalForRateLimit.__resqFoodRateLimits ?? new Map<string, MemoryRecord>();

globalForRateLimit.__resqFoodRateLimits = memoryRateLimits;

function envFlagIsFalse(value: string | undefined) {
  return value ? ["0", "false", "off", "no"].includes(value.toLowerCase()) : false;
}

function getRedisConfig() {
  const url =
    process.env.RATE_LIMIT_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL;
  const token =
    process.env.RATE_LIMIT_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    token,
  };
}

function getTimeoutMs() {
  const parsed = Number(process.env.RATE_LIMIT_FETCH_TIMEOUT_MS);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 700;
}

async function redisPipeline<T = unknown>(
  commands: unknown[][],
): Promise<Array<RedisPipelineResult<T>>> {
  const config = getRedisConfig();

  if (!config) {
    throw new Error("Redis rate limit is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

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
      throw new Error(`Redis rate limit request failed with ${response.status}.`);
    }

    const data = (await response.json()) as Array<RedisPipelineResult<T>>;

    if (!Array.isArray(data)) {
      throw new Error("Redis rate limit response is invalid.");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase();
}

function hashKey(parts: string[]) {
  return createHash("sha256")
    .update(parts.map(normalizeKeyPart).join("|"))
    .digest("hex");
}

function pruneMemoryLimits(now: number) {
  if (memoryRateLimits.size < 5000) {
    return;
  }

  for (const [key, record] of memoryRateLimits) {
    if (record.resetAt <= now) {
      memoryRateLimits.delete(key);
    }
  }
}

async function incrementRedisCounter(key: string, windowMs: number) {
  const results = await redisPipeline<number | string>([
    ["INCR", key],
    ["PEXPIRE", key, Math.max(1000, windowMs * 2)],
  ]);
  const counterResult = results[0];

  if (counterResult?.error) {
    throw new Error(counterResult.error);
  }

  const count = Number(counterResult?.result ?? 0);

  if (!Number.isFinite(count)) {
    throw new Error("Redis rate limit counter is invalid.");
  }

  return count;
}

function incrementMemoryCounter(key: string, resetAt: number, now: number) {
  pruneMemoryLimits(now);

  const record = memoryRateLimits.get(key);

  if (!record || record.resetAt <= now) {
    memoryRateLimits.set(key, { count: 1, resetAt });
    return 1;
  }

  record.count += 1;
  return record.count;
}

function buildHeaders(rule: RateLimitRule, remaining: number, resetAt: Date) {
  return {
    "X-RateLimit-Limit": String(rule.max),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetAt.getTime() / 1000)),
  };
}

function formatRetryAfter(seconds: number) {
  if (seconds < 60) {
    return `${seconds} detik`;
  }

  return `${Math.ceil(seconds / 60)} menit`;
}

async function auditRateLimitBlock(
  request: Request,
  rule: RateLimitRule,
  identityParts: string[],
  retryAfterSeconds: number,
) {
  if (envFlagIsFalse(process.env.SECURITY_AUDIT_ENABLED)) {
    return;
  }

  const url = new URL(request.url);

  try {
    await prisma.adminActionLog.create({
      data: {
        action: rule.auditAction || "RATE_LIMIT_BLOCKED",
        targetType: "security",
        targetId: rule.keyPrefix,
        metadata: {
          keyPrefix: rule.keyPrefix,
          path: url.pathname,
          method: request.method,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || null,
          identityHash:
            identityParts.length > 0 ? hashKey(identityParts) : null,
          retryAfterSeconds,
          limit: rule.max,
          windowMs: rule.windowMs,
        },
      },
    });
  } catch (error) {
    console.warn("Security audit log failed", error);
  }
}

export async function enforceRateLimit(
  request: Request,
  rule: RateLimitRule,
  identityParts: string[] = [],
): Promise<RateLimitResult> {
  if (envFlagIsFalse(process.env.RATE_LIMIT_ENABLED)) {
    return {
      allowed: true,
      limit: rule.max,
      remaining: rule.max,
      resetAt: new Date(Date.now() + rule.windowMs),
    };
  }

  const now = Date.now();
  const windowIndex = Math.floor(now / rule.windowMs);
  const resetAtMs = (windowIndex + 1) * rule.windowMs;
  const resetAt = new Date(resetAtMs);
  const keyHash = hashKey([getClientIp(request), ...identityParts]);
  const key = `resqfood:rate:${rule.keyPrefix}:${windowIndex}:${keyHash}`;
  let count: number;

  if (getRedisConfig()) {
    try {
      count = await incrementRedisCounter(key, rule.windowMs);
    } catch (error) {
      console.warn("Redis rate limit failed; using memory fallback", error);
      count = incrementMemoryCounter(key, resetAtMs, now);
    }
  } else {
    count = incrementMemoryCounter(key, resetAtMs, now);
  }

  const remaining = Math.max(0, rule.max - count);

  if (count <= rule.max) {
    return {
      allowed: true,
      limit: rule.max,
      remaining,
      resetAt,
    };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
  await auditRateLimitBlock(request, rule, identityParts, retryAfterSeconds);

  return {
    allowed: false,
    limit: rule.max,
    remaining: 0,
    resetAt,
    retryAfterSeconds,
    response: NextResponse.json(
      {
        ok: false,
        message:
          rule.message ||
          `Terlalu banyak percobaan. Coba lagi dalam ${formatRetryAfter(
            retryAfterSeconds,
          )}.`,
      },
      {
        status: 429,
        headers: {
          ...buildHeaders(rule, 0, resetAt),
          "Retry-After": String(retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    ),
  };
}
