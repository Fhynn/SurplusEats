import { NextResponse } from "next/server";

import { clearSessionCookie, getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    const response = NextResponse.json(
      { ok: false, user: null },
      { status: 401 },
    );

    clearSessionCookie(response);

    return response;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    const response = NextResponse.json(
      { ok: false, user: null },
      { status: user ? 403 : 404 },
    );

    clearSessionCookie(response);

    return response;
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
      ownerStatus: session.ownerStatus,
    },
  });
}
