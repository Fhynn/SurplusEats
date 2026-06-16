import { UserRole, UserStatus } from "@prisma/client";

import type { AuthSession } from "@/lib/auth-session";
import {
  getSessionExpiresAt,
  getSessionMaxAgeSeconds,
} from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type PersistedSessionKind =
  | "LOGIN"
  | "REGISTER"
  | "IMPERSONATION"
  | "ADMIN_RETURN";

type PersistedSessionInput = {
  userId: string;
  request: Request;
  kind?: PersistedSessionKind;
  rememberMe?: boolean;
  maxAgeSeconds?: number;
  impersonatedById?: string | null;
};

const maxUserAgentLength = 500;
const touchThrottleMs = 60 * 1000;

function getHeaderValue(headers: Headers, name: string) {
  return headers.get(name)?.trim() || null;
}

export function getRequestIp(request: Request) {
  const forwardedFor = getHeaderValue(request.headers, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    getHeaderValue(request.headers, "x-real-ip") ||
    getHeaderValue(request.headers, "cf-connecting-ip") ||
    getHeaderValue(request.headers, "x-vercel-forwarded-for")
  );
}

function getBrowserName(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  if (/OPR\//i.test(userAgent)) return "Opera";

  return "Browser";
}

function getOsName(userAgent: string) {
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";

  return "Device";
}

export function getDeviceLabel(userAgent?: string | null) {
  if (!userAgent) {
    return "Perangkat tidak dikenal";
  }

  const formFactor = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    ? "Mobile"
    : "Desktop";

  return `${getBrowserName(userAgent)} di ${getOsName(userAgent)} ${formFactor}`;
}

export async function createPersistedSession({
  userId,
  request,
  kind = "LOGIN",
  rememberMe = true,
  maxAgeSeconds,
  impersonatedById = null,
}: PersistedSessionInput) {
  const tokenId = crypto.randomUUID();
  const ttl = maxAgeSeconds ?? getSessionMaxAgeSeconds(rememberMe);
  const userAgent = getHeaderValue(request.headers, "user-agent");
  const record = await prisma.userSession.create({
    data: {
      tokenId,
      userId,
      kind,
      deviceLabel: getDeviceLabel(userAgent),
      userAgent: userAgent?.slice(0, maxUserAgentLength),
      ipAddress: getRequestIp(request),
      impersonatedById,
      expiresAt: getSessionExpiresAt(rememberMe, ttl),
    },
  });

  return {
    record,
    tokenId,
    maxAgeSeconds: ttl,
  };
}

export async function validatePersistedSession(session: AuthSession) {
  if (!session.sessionId) {
    return null;
  }

  const record = await prisma.userSession.findUnique({
    where: { tokenId: session.sessionId },
    include: {
      impersonatedBy: {
        select: { id: true, email: true, name: true, role: true, status: true },
      },
    },
  });

  if (
    !record ||
    record.userId !== session.userId ||
    record.revokedAt ||
    record.expiresAt.getTime() <= Date.now() ||
    (record.impersonatedById ?? null) !== (session.impersonatedById ?? null)
  ) {
    return null;
  }

  if (
    record.impersonatedById &&
    (!record.impersonatedBy ||
      record.impersonatedBy.role !== UserRole.ADMIN ||
      record.impersonatedBy.status !== UserStatus.ACTIVE)
  ) {
    return null;
  }

  if (Date.now() - record.lastSeenAt.getTime() > touchThrottleMs) {
    await prisma.userSession.updateMany({
      where: {
        tokenId: session.sessionId,
        revokedAt: null,
      },
      data: { lastSeenAt: new Date() },
    });
  }

  return record;
}

export async function revokePersistedSession(
  sessionId: string | null | undefined,
  {
    revokedById,
    revokeReason,
  }: {
    revokedById?: string | null;
    revokeReason: string;
  },
) {
  if (!sessionId) {
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      tokenId: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedById: revokedById ?? null,
      revokeReason,
    },
  });
}
