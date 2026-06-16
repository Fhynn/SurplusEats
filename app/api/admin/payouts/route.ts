import {
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { settleCompletedWalletTransactions } from "@/lib/wallet-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializePayout(
  payout: Awaited<ReturnType<typeof prisma.walletTransaction.findMany>>[number] & {
    restaurant: {
      id: string;
      name: string;
      city: string;
      owner: {
        id: string;
        name: string;
        email: string;
      };
    };
  },
) {
  return {
    id: payout.id,
    amount: Math.abs(payout.amount),
    rawAmount: payout.amount,
    status: payout.status,
    reference: payout.reference,
    payoutBatchReference: payout.payoutBatchReference,
    transferReference: payout.transferReference,
    transferProofUrl: payout.transferProofUrl,
    bankName: payout.bankName,
    bankAccountNumber: payout.bankAccountNumber,
    bankAccountHolder: payout.bankAccountHolder,
    bankValidationStatus: payout.bankValidationStatus,
    payoutFee: payout.payoutFee,
    payoutNetAmount: payout.payoutNetAmount,
    processedAt: payout.processedAt?.toISOString() ?? null,
    processedBy: payout.processedBy,
    adminNote: payout.adminNote,
    description: payout.description,
    createdAt: payout.createdAt.toISOString(),
    updatedAt: payout.updatedAt.toISOString(),
    restaurant: payout.restaurant,
  };
}

export async function GET() {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  await settleCompletedWalletTransactions();

  const payouts = await prisma.walletTransaction.findMany({
    where: {
      type: WalletTransactionType.PAYOUT,
    },
    include: {
      restaurant: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });
  const pendingAmount = payouts
    .filter((payout) => payout.status === WalletTransactionStatus.PENDING)
    .reduce((total, payout) => total + Math.abs(payout.amount), 0);
  const completedAmount = payouts
    .filter((payout) => payout.status === WalletTransactionStatus.COMPLETED)
    .reduce((total, payout) => total + Math.abs(payout.amount), 0);

  return NextResponse.json({
    ok: true,
    metrics: {
      total: payouts.length,
      pending: payouts.filter(
        (payout) => payout.status === WalletTransactionStatus.PENDING,
      ).length,
      completed: payouts.filter(
        (payout) => payout.status === WalletTransactionStatus.COMPLETED,
      ).length,
      rejected: payouts.filter(
        (payout) => payout.status === WalletTransactionStatus.FAILED,
      ).length,
      pendingAmount,
      completedAmount,
    },
    payouts: payouts.map(serializePayout),
  });
}
