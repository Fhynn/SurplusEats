import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  getCurrentSession,
  type OwnerAccessStatus,
} from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function invalidSessionResponse(status = 401) {
  const response = NextResponse.json(
    { ok: false, session: null },
    { status },
  );

  clearSessionCookie(response);

  return response;
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return invalidSessionResponse();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return invalidSessionResponse(user ? 403 : 404);
  }

  const ownerStatus =
    user.role === UserRole.OWNER ? await getOwnerStatus(user.id) : "NONE";

  return NextResponse.json({
    ok: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      ownerStatus,
    },
  });
}
