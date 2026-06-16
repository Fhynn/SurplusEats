import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  createSessionToken,
  getCurrentSession,
  setSessionCookie,
} from "@/lib/auth-session";
import {
  createPersistedSession,
  revokePersistedSession,
} from "@/lib/auth-session-records";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.impersonatedById) {
    return NextResponse.json(
      { ok: false, message: "Session bukan mode impersonasi." },
      { status: 400 },
    );
  }

  const targetUserId = session.userId;

  await revokePersistedSession(session.sessionId, {
    revokedById: session.impersonatedById,
    revokeReason: "STOP_IMPERSONATION",
  });

  const admin = await prisma.user.findUnique({
    where: { id: session.impersonatedById },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!admin || admin.role !== UserRole.ADMIN || admin.status !== UserStatus.ACTIVE) {
    const response = NextResponse.json(
      { ok: false, message: "Admin tidak aktif. Login ulang diperlukan." },
      { status: 403 },
    );

    clearSessionCookie(response);

    return response;
  }

  const adminSession = await createPersistedSession({
    userId: admin.id,
    request,
    kind: "ADMIN_RETURN",
  });
  const token = await createSessionToken({
    sessionId: adminSession.tokenId,
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    ownerStatus: "NONE",
  });
  const redirectTo = `/admin/users/${targetUserId}`;
  const response = NextResponse.json({ ok: true, redirectTo });

  setSessionCookie(response, token, adminSession.maxAgeSeconds);

  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "USER_IMPERSONATION_STOPPED",
      targetType: "user",
      targetId: targetUserId,
    },
  });

  return response;
}
