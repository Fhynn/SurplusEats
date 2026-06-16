import {
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import type { PrismaTransactionClient } from "@/lib/prisma";

type OrderIncomeWalletTargetStatus =
  | typeof WalletTransactionStatus.COMPLETED
  | typeof WalletTransactionStatus.FAILED;

export async function transitionOrderIncomeWalletTransaction(
  tx: PrismaTransactionClient,
  {
    restaurantId,
    orderCode,
    nextStatus,
    processedAt,
    description,
  }: {
    restaurantId: string;
    orderCode: string;
    nextStatus: OrderIncomeWalletTargetStatus;
    processedAt: Date;
    description: string;
  },
) {
  const transaction = await tx.walletTransaction.findFirst({
    where: {
      restaurantId,
      type: WalletTransactionType.ORDER_INCOME,
      reference: orderCode,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!transaction) {
    throw new Error(`Transaksi wallet untuk order ${orderCode} belum tersedia.`);
  }

  if (transaction.status === nextStatus) {
    return false;
  }

  if (transaction.status !== WalletTransactionStatus.PENDING) {
    throw new Error(
      `Transaksi wallet order ${orderCode} sudah berstatus ${transaction.status}.`,
    );
  }

  await tx.walletTransaction.update({
    where: { id: transaction.id },
    data: {
      status: nextStatus,
      processedAt,
      description,
    },
  });

  return true;
}
