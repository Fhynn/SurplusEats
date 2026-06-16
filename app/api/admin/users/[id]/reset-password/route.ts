import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResetPasswordRouteProps {
  params: Promise<{ id: string }>;
}

const resetPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  revokeSessions: z.boolean().default(true),
});

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
    "",
  );

  return `Rq-${body}!`;
}

export async function POST(
  request: Request,
  { params }: ResetPasswordRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = resetPasswordSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Password minimal 8 karakter.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true },
  });

  if (!targetUser || targetUser.role === UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan atau tidak boleh direset." },
      { status: 404 },
    );
  }

  const temporaryPassword = parsed.data.password || generateTemporaryPassword();

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: { passwordHash: hashPassword(temporaryPassword) },
    });

    if (parsed.data.revokeSessions) {
      await tx.userSession.updateMany({
        where: { userId: targetUser.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedById: session.userId,
          revokeReason: "PASSWORD_RESET_BY_ADMIN",
        },
      });
    }

    await tx.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: "USER_PASSWORD_RESET",
        targetType: "user",
        targetId: targetUser.id,
        metadata: {
          email: targetUser.email,
          revokedSessions: parsed.data.revokeSessions,
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    temporaryPassword,
    revokedSessions: parsed.data.revokeSessions,
  });
}
