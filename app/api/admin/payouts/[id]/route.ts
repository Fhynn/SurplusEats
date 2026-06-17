import {
  NotificationType,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { createNotificationAndDeliver } from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminPayoutRouteProps {
  params: Promise<{ id: string }>;
}

const updatePayoutSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.string().trim().max(500).optional(),
  transferReference: z.string().trim().max(120).optional(),
  transferProofUrl: z.string().trim().url().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: AdminPayoutRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminPayoutMutation,
    session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = updatePayoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Aksi payout tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    parsed.data.action === "APPROVE" &&
    (!parsed.data.transferReference || parsed.data.transferReference.length < 4)
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nomor referensi transfer wajib diisi saat menyetujui payout.",
      },
      { status: 400 },
    );
  }

  const payout = await prisma.walletTransaction.findFirst({
    where: {
      id,
      type: WalletTransactionType.PAYOUT,
    },
    include: {
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!payout) {
    return NextResponse.json(
      { ok: false, message: "Request payout tidak ditemukan." },
      { status: 404 },
    );
  }

  if (payout.status !== WalletTransactionStatus.PENDING) {
    return NextResponse.json(
      { ok: false, message: "Request payout sudah diproses." },
      { status: 400 },
    );
  }

  const nextStatus =
    parsed.data.action === "APPROVE"
      ? WalletTransactionStatus.COMPLETED
      : WalletTransactionStatus.FAILED;
  const updatedPayout = await prisma.walletTransaction.update({
    where: { id: payout.id },
    data: {
      status: nextStatus,
      processedAt: new Date(),
      processedBy: session.name,
      adminNote: parsed.data.adminNote,
      transferReference:
        nextStatus === WalletTransactionStatus.COMPLETED
          ? parsed.data.transferReference
          : undefined,
      transferProofUrl:
        nextStatus === WalletTransactionStatus.COMPLETED
          ? parsed.data.transferProofUrl
          : undefined,
      description: parsed.data.adminNote
        ? `${payout.description || "Pencairan saldo"} - Admin: ${parsed.data.adminNote}`
        : payout.description,
    },
    include: {
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
  });

  await createNotificationAndDeliver({
    userId: payout.restaurant.ownerId,
    type: NotificationType.SYSTEM,
    title:
      nextStatus === WalletTransactionStatus.COMPLETED
        ? "Pencairan saldo disetujui"
        : "Pencairan saldo ditolak",
    body:
      nextStatus === WalletTransactionStatus.COMPLETED
        ? `${payout.reference || "Request payout"} disetujui. Referensi transfer: ${parsed.data.transferReference}.`
        : `${payout.reference || "Request payout"} ditolak admin.${
            parsed.data.adminNote ? ` Catatan: ${parsed.data.adminNote}` : ""
          }`,
    href: "/owner/wallet",
  });

  await prisma.adminActionLog.create({
    data: {
      adminId: session.userId,
      action:
        nextStatus === WalletTransactionStatus.COMPLETED
          ? "PAYOUT_APPROVED"
          : "PAYOUT_REJECTED",
      targetType: "wallet_transaction",
      targetId: payout.id,
      metadata: {
        reference: payout.reference,
        amount: Math.abs(payout.amount),
        adminNote: parsed.data.adminNote,
        transferReference: parsed.data.transferReference,
        transferProofUrl: parsed.data.transferProofUrl,
      },
    },
  });

  return NextResponse.json({ ok: true, payout: updatedPayout });
}
