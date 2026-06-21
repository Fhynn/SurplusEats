import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getOwnerWalletSettlementHours } from "@/lib/wallet-payout";

type IntegritySeverity = "low" | "medium" | "high";

type IntegrityIssue = {
  code: string;
  severity: IntegritySeverity;
  message: string;
  count: number;
  sample: Array<Record<string, unknown>>;
};

type RawDuplicateWalletIncome = {
  restaurantId: string;
  reference: string;
  count: number;
};

type RawDuplicateVoucherClaim = {
  voucherId: string;
  userId: string;
  count: number;
};

type RawVoucherOrderMismatch = {
  id: string;
  voucherId: string;
  userId: string;
  orderId: string;
  customerId: string | null;
};

type RawReviewMismatch = {
  id: string;
  orderId: string;
  userId: string;
  customerId: string;
  restaurantId: string;
  orderRestaurantId: string;
};

type RawInvalidMenuPricing = {
  id: string;
  restaurantId: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
};

const paidOperationalStatuses = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
  OrderStatus.NO_SHOW,
];

function getLookbackCutoff(now: Date) {
  const configuredDays = Number(process.env.DATA_RECONCILIATION_LOOKBACK_DAYS);
  const lookbackDays =
    Number.isFinite(configuredDays) && configuredDays > 0
      ? Math.min(365, Math.round(configuredDays))
      : 30;

  return {
    lookbackDays,
    cutoff: new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000),
  };
}

function getExpectedWalletAmounts(order: {
  total: number;
  serviceFee: number;
  taxFee: number;
  platformFee: number;
}) {
  const customerPlatformFee = order.serviceFee + order.taxFee;
  const merchantGrossAmount = Math.max(0, order.total - customerPlatformFee);
  const merchantCommission = Math.min(merchantGrossAmount, order.platformFee);
  const merchantIncome = Math.max(0, merchantGrossAmount - merchantCommission);

  return {
    amount: merchantIncome,
    grossAmount: merchantGrossAmount,
    platformFee: merchantCommission,
    netAmount: merchantIncome,
  };
}

function pushIssue(
  issues: IntegrityIssue[],
  issue: Omit<IntegrityIssue, "sample"> & {
    sample?: IntegrityIssue["sample"];
  },
) {
  if (issue.count <= 0) {
    return;
  }

  issues.push({
    ...issue,
    sample: issue.sample ?? [],
  });
}

export async function runDataIntegrityReconciliation({
  actorId,
  source = "cron",
  now = new Date(),
}: {
  actorId?: string | null;
  source?: "cron" | "admin";
  now?: Date;
} = {}) {
  const startedAt = new Date();
  const { cutoff, lookbackDays } = getLookbackCutoff(now);
  const issues: IntegrityIssue[] = [];

  const recentPaidOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      status: { in: paidOperationalStatuses },
      paidAt: { gte: cutoff },
    },
    select: {
      id: true,
      orderCode: true,
      restaurantId: true,
      subtotal: true,
      discount: true,
      serviceFee: true,
      taxFee: true,
      platformFee: true,
      total: true,
      items: {
        select: {
          priceSnapshot: true,
          quantity: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
    take: 500,
  });
  const orderCodes = recentPaidOrders.map((order) => order.orderCode);
  const orderIncomeTransactions =
    orderCodes.length > 0
      ? await prisma.walletTransaction.findMany({
          where: {
            type: WalletTransactionType.ORDER_INCOME,
            reference: { in: orderCodes },
          },
          select: {
            id: true,
            restaurantId: true,
            amount: true,
            grossAmount: true,
            platformFee: true,
            netAmount: true,
            reference: true,
            status: true,
          },
        })
      : [];
  const incomeTransactionsByReference = new Map(
    orderCodes.map((orderCode) => [
      orderCode,
      orderIncomeTransactions.filter(
        (transaction) => transaction.reference === orderCode,
      ),
    ]),
  );
  const missingWalletIncome = recentPaidOrders.filter(
    (order) => (incomeTransactionsByReference.get(order.orderCode) ?? []).length === 0,
  );
  const mismatchedWalletIncome = recentPaidOrders.filter((order) => {
    const transaction = (incomeTransactionsByReference.get(order.orderCode) ?? [])[0];

    if (!transaction) {
      return false;
    }

    const expected = getExpectedWalletAmounts(order);

    return (
      transaction.restaurantId !== order.restaurantId ||
      transaction.amount !== expected.amount ||
      transaction.grossAmount !== expected.grossAmount ||
      transaction.platformFee !== expected.platformFee ||
      transaction.netAmount !== expected.netAmount
    );
  });
  const totalMismatchOrders = recentPaidOrders.filter((order) => {
    const expectedSubtotal = order.items.reduce(
      (total, item) => total + item.priceSnapshot * item.quantity,
      0,
    );
    const expectedTotal =
      Math.max(0, expectedSubtotal - order.discount) +
      order.serviceFee +
      order.taxFee;

    return order.subtotal !== expectedSubtotal || order.total !== expectedTotal;
  });

  pushIssue(issues, {
    code: "PAID_ORDER_MISSING_WALLET_INCOME",
    severity: "high",
    message: "Order PAID operasional belum punya transaksi wallet income.",
    count: missingWalletIncome.length,
    sample: missingWalletIncome.slice(0, 10).map((order) => ({
      orderCode: order.orderCode,
      restaurantId: order.restaurantId,
      total: order.total,
    })),
  });
  pushIssue(issues, {
    code: "ORDER_WALLET_AMOUNT_MISMATCH",
    severity: "high",
    message: "Nominal wallet income tidak cocok dengan fee/komisi order.",
    count: mismatchedWalletIncome.length,
    sample: mismatchedWalletIncome.slice(0, 10).map((order) => {
      const transaction = (incomeTransactionsByReference.get(order.orderCode) ?? [])[0];

      return {
        orderCode: order.orderCode,
        expected: getExpectedWalletAmounts(order),
        actual: transaction
          ? {
              id: transaction.id,
              amount: transaction.amount,
              grossAmount: transaction.grossAmount,
              platformFee: transaction.platformFee,
              netAmount: transaction.netAmount,
              status: transaction.status,
            }
          : null,
      };
    }),
  });
  pushIssue(issues, {
    code: "ORDER_TOTAL_MISMATCH",
    severity: "high",
    message: "Subtotal/total order tidak cocok dengan item snapshot dan fee.",
    count: totalMismatchOrders.length,
    sample: totalMismatchOrders.slice(0, 10).map((order) => ({
      orderCode: order.orderCode,
      subtotal: order.subtotal,
      expectedSubtotal: order.items.reduce(
        (total, item) => total + item.priceSnapshot * item.quantity,
        0,
      ),
      total: order.total,
    })),
  });

  const duplicateWalletIncome = await prisma.$queryRaw<
    RawDuplicateWalletIncome[]
  >`
    SELECT "restaurantId", "reference", COUNT(*)::int AS "count"
    FROM "WalletTransaction"
    WHERE "type"::text = 'ORDER_INCOME'
      AND "reference" IS NOT NULL
    GROUP BY "restaurantId", "reference"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 25
  `;
  pushIssue(issues, {
    code: "DUPLICATE_WALLET_INCOME_REFERENCE",
    severity: "high",
    message: "Ada lebih dari satu wallet income untuk order yang sama.",
    count: duplicateWalletIncome.length,
    sample: duplicateWalletIncome.map((item) => ({
      restaurantId: item.restaurantId,
      orderCode: item.reference,
      count: item.count,
    })),
  });

  const settlementHours = getOwnerWalletSettlementHours();
  const settlementCutoff = new Date(
    now.getTime() - settlementHours * 60 * 60 * 1000,
  );
  const pendingIncomeTransactions = await prisma.walletTransaction.findMany({
    where: {
      type: WalletTransactionType.ORDER_INCOME,
      status: WalletTransactionStatus.PENDING,
      reference: { not: null },
    },
    select: {
      id: true,
      reference: true,
      restaurantId: true,
      amount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const pendingOrderCodes = pendingIncomeTransactions
    .map((transaction) => transaction.reference)
    .filter((reference): reference is string => Boolean(reference));
  const settleableOrders =
    pendingOrderCodes.length > 0
      ? await prisma.order.findMany({
          where: {
            orderCode: { in: pendingOrderCodes },
            status: { in: [OrderStatus.COMPLETED, OrderStatus.NO_SHOW] },
          },
          select: {
            orderCode: true,
            completedAt: true,
            noShowAt: true,
            updatedAt: true,
          },
        })
      : [];
  const settleableOrderByCode = new Map(
    settleableOrders.map((order) => [order.orderCode, order]),
  );
  const stalePendingIncome = pendingIncomeTransactions.filter((transaction) => {
    const order = transaction.reference
      ? settleableOrderByCode.get(transaction.reference)
      : null;
    const baseDate = order?.completedAt ?? order?.noShowAt ?? order?.updatedAt;

    return Boolean(baseDate && baseDate <= settlementCutoff);
  });
  pushIssue(issues, {
    code: "STALE_PENDING_WALLET_INCOME",
    severity: "medium",
    message: "Wallet income masih pending padahal order sudah melewati cutoff settlement.",
    count: stalePendingIncome.length,
    sample: stalePendingIncome.slice(0, 10).map((transaction) => ({
      transactionId: transaction.id,
      orderCode: transaction.reference,
      restaurantId: transaction.restaurantId,
      amount: transaction.amount,
      settlementHours,
    })),
  });

  const paidRefundOrderMismatch = await prisma.refundRequest.findMany({
    where: {
      status: RefundStatus.PAID,
      order: {
        OR: [
          { status: { not: OrderStatus.REFUNDED } },
          { paymentStatus: { not: PaymentStatus.REFUNDED } },
        ],
      },
    },
    select: {
      id: true,
      amount: true,
      order: {
        select: {
          orderCode: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
    take: 25,
  });
  const refundedOrderWithoutPaidRefund = await prisma.order.findMany({
    where: {
      AND: [
        {
          OR: [
            { status: OrderStatus.REFUNDED },
            { paymentStatus: PaymentStatus.REFUNDED },
          ],
        },
        {
          OR: [
            { refundRequest: { is: null } },
            { refundRequest: { is: { status: { not: RefundStatus.PAID } } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      orderCode: true,
      status: true,
      paymentStatus: true,
      refundRequest: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    take: 25,
  });
  pushIssue(issues, {
    code: "PAID_REFUND_ORDER_NOT_REFUNDED",
    severity: "high",
    message: "Refund PAID tidak sinkron dengan status order REFUNDED.",
    count: paidRefundOrderMismatch.length,
    sample: paidRefundOrderMismatch.map((refund) => ({
      refundId: refund.id,
      orderCode: refund.order.orderCode,
      orderStatus: refund.order.status,
      paymentStatus: refund.order.paymentStatus,
      amount: refund.amount,
    })),
  });
  pushIssue(issues, {
    code: "REFUNDED_ORDER_WITHOUT_PAID_REFUND",
    severity: "high",
    message: "Order REFUNDED tidak punya refund request PAID.",
    count: refundedOrderWithoutPaidRefund.length,
    sample: refundedOrderWithoutPaidRefund.map((order) => ({
      orderCode: order.orderCode,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      refundStatus: order.refundRequest?.status ?? null,
    })),
  });

  const duplicateOpenVoucherClaims = await prisma.$queryRaw<
    RawDuplicateVoucherClaim[]
  >`
    SELECT "voucherId", "userId", COUNT(*)::int AS "count"
    FROM "VoucherRedemption"
    WHERE "orderId" IS NULL
    GROUP BY "voucherId", "userId"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 25
  `;
  const voucherOrderMismatch = await prisma.$queryRaw<
    RawVoucherOrderMismatch[]
  >`
    SELECT vr."id", vr."voucherId", vr."userId", vr."orderId", o."customerId"
    FROM "VoucherRedemption" vr
    LEFT JOIN "Order" o ON o."id" = vr."orderId"
    WHERE vr."orderId" IS NOT NULL
      AND (o."id" IS NULL OR o."customerId" <> vr."userId")
    LIMIT 25
  `;
  pushIssue(issues, {
    code: "DUPLICATE_OPEN_VOUCHER_CLAIM",
    severity: "medium",
    message: "Ada klaim voucher aktif ganda untuk user dan voucher yang sama.",
    count: duplicateOpenVoucherClaims.length,
    sample: duplicateOpenVoucherClaims.map((item) => ({
      voucherId: item.voucherId,
      userId: item.userId,
      count: item.count,
    })),
  });
  pushIssue(issues, {
    code: "VOUCHER_REDEMPTION_ORDER_MISMATCH",
    severity: "high",
    message: "Voucher redemption terhubung ke order hilang atau order user lain.",
    count: voucherOrderMismatch.length,
    sample: voucherOrderMismatch.map((item) => ({
      redemptionId: item.id,
      voucherId: item.voucherId,
      userId: item.userId,
      orderId: item.orderId,
      orderCustomerId: item.customerId,
    })),
  });

  const reviewMismatch = await prisma.$queryRaw<RawReviewMismatch[]>`
    SELECT r."id", r."orderId", r."userId", o."customerId", r."restaurantId", o."restaurantId" AS "orderRestaurantId"
    FROM "Review" r
    INNER JOIN "Order" o ON o."id" = r."orderId"
    WHERE r."userId" <> o."customerId"
      OR r."restaurantId" <> o."restaurantId"
    LIMIT 25
  `;
  pushIssue(issues, {
    code: "REVIEW_ORDER_MISMATCH",
    severity: "medium",
    message: "Review tidak cocok dengan customer atau restoran pada order.",
    count: reviewMismatch.length,
    sample: reviewMismatch.map((item) => ({
      reviewId: item.id,
      orderId: item.orderId,
      reviewUserId: item.userId,
      orderCustomerId: item.customerId,
      reviewRestaurantId: item.restaurantId,
      orderRestaurantId: item.orderRestaurantId,
    })),
  });

  const invalidMenuPricing = await prisma.$queryRaw<RawInvalidMenuPricing[]>`
    SELECT "id", "restaurantId", "name", "originalPrice", "discountedPrice"
    FROM "MenuItem"
    WHERE "stock" < 0
      OR "soldCount" < 0
      OR "discountedPrice" > "originalPrice"
      OR "originalPrice" <= 0
      OR "discountedPrice" <= 0
    LIMIT 25
  `;
  pushIssue(issues, {
    code: "INVALID_MENU_NUMBERS",
    severity: "medium",
    message: "Menu punya stok/sold count/harga yang tidak valid.",
    count: invalidMenuPricing.length,
    sample: invalidMenuPricing.map((item) => ({
      menuItemId: item.id,
      restaurantId: item.restaurantId,
      name: item.name,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
    })),
  });

  const finishedAt = new Date();
  const summary = {
    source,
    lookbackDays,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    issueGroups: issues.length,
    totalIssueCount: issues.reduce((total, issue) => total + issue.count, 0),
    highIssueCount: issues
      .filter((issue) => issue.severity === "high")
      .reduce((total, issue) => total + issue.count, 0),
    mediumIssueCount: issues
      .filter((issue) => issue.severity === "medium")
      .reduce((total, issue) => total + issue.count, 0),
    lowIssueCount: issues
      .filter((issue) => issue.severity === "low")
      .reduce((total, issue) => total + issue.count, 0),
  };

  await prisma.adminActionLog.create({
    data: {
      adminId: actorId || undefined,
      action:
        summary.totalIssueCount > 0
          ? "DATA_INTEGRITY_RECONCILIATION_ISSUES"
          : "DATA_INTEGRITY_RECONCILIATION_OK",
      targetType: "data_integrity",
      targetId: startedAt.toISOString(),
      metadata: JSON.parse(JSON.stringify({
        summary,
        issues,
      })),
    },
  });

  return {
    ok: summary.highIssueCount === 0,
    summary,
    issues,
  };
}
