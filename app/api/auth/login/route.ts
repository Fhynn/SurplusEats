import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSessionToken,
  setSessionCookie,
  type OwnerAccessStatus,
} from "@/lib/auth-session";
import { createPersistedSession } from "@/lib/auth-session-records";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

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
  if (role === UserRole.ADMIN) {
    return "/admin/dashboard";
  }

  if (role === UserRole.OWNER) {
    return ownerStatus === "APPROVED" ? "/owner/dashboard" : "/owner/verify";
  }

  return "/home";
}

export async function POST(request: Request) {
  const ipRateLimit = await enforceRateLimit(request, {
    keyPrefix: "auth-login-ip",
    max: 30,
    windowMs: 10 * 60 * 1000,
    auditAction: "LOGIN_IP_RATE_LIMIT_BLOCKED",
  });

  if (!ipRateLimit.allowed) {
    return ipRateLimit.response;
  }

  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Email atau password tidak valid." },
      { status: 400 },
    );
  }

  const { email, password, rememberMe } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const accountRateLimit = await enforceRateLimit(
    request,
    {
      keyPrefix: "auth-login-account",
      max: 8,
      windowMs: 10 * 60 * 1000,
      message: "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.",
      auditAction: "LOGIN_ACCOUNT_RATE_LIMIT_BLOCKED",
    },
    [normalizedEmail],
  );

  if (!accountRateLimit.allowed) {
    return accountRateLimit.response;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, message: "Email belum terdaftar atau password salah." },
      { status: 401 },
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      { ok: false, message: "Akun tidak aktif. Hubungi support." },
      { status: 403 },
    );
  }

  const ownerStatus =
    user.role === UserRole.OWNER ? await getOwnerStatus(user.id) : "NONE";
  const persistedSession = await createPersistedSession({
    userId: user.id,
    request,
    kind: "LOGIN",
    rememberMe,
  });
  const token = await createSessionToken(
    {
      sessionId: persistedSession.tokenId,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      ownerStatus,
    },
    rememberMe,
  );
  const redirectTo = getRedirectTo(user.role, ownerStatus);
  const response = NextResponse.json({
    ok: true,
    redirectTo,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ownerStatus,
    },
  });

  setSessionCookie(response, token, persistedSession.maxAgeSeconds);

  return response;
}
