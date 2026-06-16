import {
  NotificationType,
  OrderStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import { createManyNotificationsAndDeliver } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { getOwnerWalletSettlementHours } from "@/lib/wallet-payout";

function getSettlementBaseDate(order: {
  completedAt: Date | null;
  noShowAt: Date | null;
  updatedAt: Date;
}) {
  return order.completedAt ?? order.noShowAt ?? order.updatedAt;
}

export async function settleCompletedWalletTransactions(now = new Date()) {
  const settlementHours = getOwnerWalletSettlementHours();
  const cutoff = new Date(now.getTime() - settlementHours * 60 * 60 * 1000);
  const pendingIncomeTransactions = await prisma.walletTransaction.findMany({
    where: {
      type: WalletTransactionType.ORDER_INCOME,
      status: WalletTransactionStatus.PENDING,
      reference: { not: null },
    },
    include: {
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  if (pendingIncomeTransactions.length === 0) {
    return {
      settledCount: 0,
      settlementHours,
      cutoff,
    };
  }

  const orderCodes = pendingIncomeTransactions
    .map((transaction) => transaction.reference)
    .filter((reference): reference is string => Boolean(reference));
  const orders = await prisma.order.findMany({
    where: {
      orderCode: { in: orderCodes },
      status: { in: [OrderStatus.COMPLETED, OrderStatus.NO_SHOW] },
    },
    select: {
      orderCode: true,
      completedAt: true,
      noShowAt: true,
      updatedAt: true,
    },
  });
  const ordersByCode = new Map(orders.map((order) => [order.orderCode, order]));
  const eligibleTransactions = pendingIncomeTransactions.filter((transaction) => {
    const order = transaction.reference
      ? ordersByCode.get(transaction.reference)
      : null;

    if (!order) {
      return false;
    }

    return getSettlementBaseDate(order) <= cutoff;
  });

  if (eligibleTransactions.length === 0) {
    return {
      settledCount: 0,
      settlementHours,
      cutoff,
    };
  }

  const notificationPayloads = eligibleTransactions.map((transaction) => ({
    userId: transaction.restaurant.ownerId,
    type: NotificationType.SYSTEM,
    title: "Saldo order masuk wallet",
    body: `${transaction.reference || "Order"} sudah masuk saldo tersedia.`,
    href: "/owner/wallet",
  }));

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    for (const transaction of eligibleTransactions) {
      await tx.walletTransaction.updateMany({
        where: {
          id: transaction.id,
          status: WalletTransactionStatus.PENDING,
        },
        data: {
          status: WalletTransactionStatus.COMPLETED,
          processedAt: now,
          description:
            transaction.description ||
            `Settlement otomatis ${transaction.reference || "order"}`,
        },
      });
    }
  });

  await createManyNotificationsAndDeliver(notificationPayloads);

  return {
    settledCount: eligibleTransactions.length,
    settlementHours,
    cutoff,
  };
}

