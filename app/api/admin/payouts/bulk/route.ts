import {
  NotificationType,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createPayoutBatchReference } from "@/lib/backend-utils";
import { getCurrentSession } from "@/lib/auth-session";
import { createManyNotificationsAndDeliver } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkPayoutSchema = z.object({
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(100)
    .transform((ids) => Array.from(new Set(ids))),
  action: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.string().trim().max(500).optional(),
  transferReference: z.string().trim().max(120).optional(),
  transferProofUrl: z.string().trim().url().max(500).optional(),
});

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = bulkPayoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data bulk payout tidak valid.",
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
        message: "Referensi transfer batch wajib diisi saat approve.",
      },
      { status: 400 },
    );
  }

  const payouts = await prisma.walletTransaction.findMany({
    where: {
      id: { in: parsed.data.ids },
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
  const foundIds = new Set(payouts.map((payout) => payout.id));
  const missingIds = parsed.data.ids.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `Payout tidak ditemukan: ${missingIds.join(", ")}.`,
      },
      { status: 404 },
    );
  }

  const processedPayout = payouts.find(
    (payout) => payout.status !== WalletTransactionStatus.PENDING,
  );

  if (processedPayout) {
    return NextResponse.json(
      {
        ok: false,
        message: `Payout ${processedPayout.reference || processedPayout.id} sudah diproses.`,
      },
      { status: 400 },
    );
  }

  const nextStatus =
    parsed.data.action === "APPROVE"
      ? WalletTransactionStatus.COMPLETED
      : WalletTransactionStatus.FAILED;
  const batchReference = createPayoutBatchReference();
  const now = new Date();

  const updatedPayouts = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const updates = [];

      for (const payout of payouts) {
        updates.push(
          await tx.walletTransaction.update({
            where: { id: payout.id },
            data: {
              status: nextStatus,
              payoutBatchReference: batchReference,
              processedAt: now,
              processedBy: session.name,
              adminNote: parsed.data.adminNote,
              transferReference:
                nextStatus === WalletTransactionStatus.COMPLETED
                  ? `${parsed.data.transferReference}-${payout.reference || payout.id}`
                  : undefined,
              transferProofUrl:
                nextStatus === WalletTransactionStatus.COMPLETED
                  ? parsed.data.transferProofUrl
                  : undefined,
              description: parsed.data.adminNote
                ? `${payout.description || "Pencairan saldo"} - Batch ${batchReference}: ${parsed.data.adminNote}`
                : payout.description,
            },
            include: {
              restaurant: {
                include: {
                  owner: true,
                },
              },
            },
          }),
        );
      }

      await tx.adminActionLog.create({
        data: {
          adminId: session.userId,
          action:
            nextStatus === WalletTransactionStatus.COMPLETED
              ? "PAYOUT_BATCH_APPROVED"
              : "PAYOUT_BATCH_REJECTED",
          targetType: "wallet_transaction",
          targetId: batchReference,
          metadata: {
            ids: parsed.data.ids,
            action: parsed.data.action,
            adminNote: parsed.data.adminNote,
            transferReference: parsed.data.transferReference,
            transferProofUrl: parsed.data.transferProofUrl,
            totalAmount: payouts.reduce(
              (total, payout) => total + Math.abs(payout.amount),
              0,
            ),
          },
        },
      });

      return updates;
    },
  );

  await createManyNotificationsAndDeliver(
    updatedPayouts.map((payout) => ({
      userId: payout.restaurant.ownerId,
      type: NotificationType.SYSTEM,
      title:
        nextStatus === WalletTransactionStatus.COMPLETED
          ? "Pencairan saldo batch disetujui"
          : "Pencairan saldo batch ditolak",
      body:
        nextStatus === WalletTransactionStatus.COMPLETED
          ? `${payout.reference || "Request payout"} diproses dalam batch ${batchReference}.`
          : `${payout.reference || "Request payout"} ditolak dalam batch ${batchReference}.`,
      href: "/owner/wallet",
    })),
  );

  return NextResponse.json({
    ok: true,
    batchReference,
    updatedCount: updatedPayouts.length,
    payouts: updatedPayouts,
  });
}

