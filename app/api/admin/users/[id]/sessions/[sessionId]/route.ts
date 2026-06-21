import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/admin-permissions";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminUserSessionRouteProps {
  params: Promise<{ id: string; sessionId: string }>;
}

const revokeSessionSchema = z.object({
  reason: z.string().trim().min(3).max(120).optional(),
});

export async function POST(
  request: Request,
  { params }: AdminUserSessionRouteProps,
) {
  const auth = await requireAdminPermission("USERS_SECURITY");

  if (auth.response) {
    return auth.response;
  }

  const { id, sessionId } = await params;
  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminSessionRevoke,
    auth.session,
    [id, sessionId],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = revokeSessionSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Alasan cabut session tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const [targetUser, targetSession] = await Promise.all([
        tx.user.findUnique({
          where: { id },
          select: { id: true, role: true, email: true },
        }),
        tx.userSession.findFirst({
          where: {
            id: sessionId,
            userId: id,
          },
          select: {
            id: true,
            tokenId: true,
            userId: true,
            kind: true,
            revokedAt: true,
            deviceLabel: true,
            ipAddress: true,
          },
        }),
      ]);

      if (!targetUser || targetUser.role === UserRole.ADMIN) {
        return { status: "not_found" as const };
      }

      if (!targetSession) {
        return { status: "session_not_found" as const };
      }

      if (targetSession.revokedAt) {
        return { status: "already_revoked" as const };
      }

      const revokeReason =
        parsed.data.reason || "SESSION_REVOKED_BY_ADMIN";
      const updated = await tx.userSession.updateMany({
        where: {
          id: targetSession.id,
          userId: targetUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedById: auth.session.userId,
          revokeReason,
        },
      });

      if (updated.count !== 1) {
        return { status: "already_revoked" as const };
      }

      await tx.adminActionLog.create({
        data: {
          adminId: auth.session.userId,
          action: "USER_SESSION_REVOKED",
          targetType: "user",
          targetId: targetUser.id,
          metadata: {
            email: targetUser.email,
            sessionId: targetSession.id,
            sessionKind: targetSession.kind,
            deviceLabel: targetSession.deviceLabel,
            ipAddress: targetSession.ipAddress,
            reason: revokeReason,
          },
        },
      });

      return { status: "revoked" as const };
    },
  );

  if (result.status === "not_found") {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan." },
      { status: 404 },
    );
  }

  if (result.status === "session_not_found") {
    return NextResponse.json(
      { ok: false, message: "Session tidak ditemukan." },
      { status: 404 },
    );
  }

  if (result.status === "already_revoked") {
    return NextResponse.json(
      { ok: false, message: "Session sudah dicabut." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
