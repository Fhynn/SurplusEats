import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/admin-permissions";
import {
  createSessionToken,
  setSessionCookie,
  type OwnerAccessStatus,
} from "@/lib/auth-session";
import { createPersistedSession } from "@/lib/auth-session-records";
import { prisma } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImpersonateRouteProps {
  params: Promise<{ id: string }>;
}

const impersonationMaxAgeSeconds = 15 * 60;

async function getOwnerStatus(userId: string): Promise<OwnerAccessStatus> {
  const approvedRestaurant = await prisma.restaurant.findFirst({
    where: { ownerId: userId, status: "APPROVED" },
    select: { id: true },
  });

  if (approvedRestaurant) {
    return "APPROVED";
  }

  const latestApplication = await prisma.restaurantApplication.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    select: { status: true },
  });

  if (!latestApplication) {
    return "NONE";
  }

  if (latestApplication.status === "APPROVED") {
    return "APPROVED";
  }

  if (latestApplication.status === "REJECTED") {
    return "REJECTED";
  }

  return "PENDING";
}

function getRedirectTo(role: UserRole, ownerStatus: OwnerAccessStatus) {
  if (role === UserRole.OWNER) {
    return ownerStatus === "APPROVED" ? "/owner/dashboard" : "/owner/verify";
  }

  return "/home";
}

export async function POST(
  request: Request,
  { params }: ImpersonateRouteProps,
) {
  const sessionCookie = request.headers.get("cookie") ?? "";
  const auth = await requireAdminPermission("ADMIN_IMPERSONATE");

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminImpersonation,
    auth.session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!targetUser || targetUser.role === UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan atau tidak boleh diimpersonate." },
      { status: 404 },
    );
  }

  if (targetUser.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      { ok: false, message: "User harus aktif sebelum bisa diimpersonate." },
      { status: 400 },
    );
  }

  const ownerStatus =
    targetUser.role === UserRole.OWNER
      ? await getOwnerStatus(targetUser.id)
      : "NONE";
  const persistedSession = await createPersistedSession({
    userId: targetUser.id,
    request,
    kind: "IMPERSONATION",
    maxAgeSeconds: impersonationMaxAgeSeconds,
    impersonatedById: auth.user.id,
  });
  const token = await createSessionToken(
    {
      sessionId: persistedSession.tokenId,
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      status: targetUser.status,
      ownerStatus,
      impersonatedById: auth.user.id,
      impersonatedByEmail: auth.user.email,
      impersonatedByName: auth.user.name,
    },
    false,
    impersonationMaxAgeSeconds,
  );
  const redirectTo = getRedirectTo(targetUser.role, ownerStatus);
  const response = NextResponse.json({ ok: true, redirectTo });

  setSessionCookie(response, token, impersonationMaxAgeSeconds);

  await prisma.adminActionLog.create({
    data: {
      adminId: auth.user.id,
      action: "USER_IMPERSONATION_STARTED",
      targetType: "user",
      targetId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        maxAgeSeconds: impersonationMaxAgeSeconds,
        previousCookiePresent: Boolean(sessionCookie),
      },
    },
  });

  return response;
}
