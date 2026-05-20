import {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RefundDetailRouteProps {
  params: Promise<{ id: string }>;
}

const updateRefundSchema = z.object({
  status: z.enum([
    RefundStatus.REVIEWING,
    RefundStatus.APPROVED,
    RefundStatus.REJECTED,
    RefundStatus.PAID,
  ]),
  adminNote: z.string().optional(),
});

async function applyPaidRefundWalletEffect(
  tx: PrismaTransactionClient,
  refund: {
    amount: number;
    order: {
      orderCode: string;
      restaurantId: string;
    };
  },
) {
  const orderIncomeTransactions = await tx.walletTransaction.findMany({
    where: {
      restaurantId: refund.order.restaurantId,
      type: WalletTransactionType.ORDER_INCOME,
      reference: refund.order.orderCode,
    },
  });
  const completedIncome = orderIncomeTransactions.find(
    (transaction) => transaction.status === WalletTransactionStatus.COMPLETED,
  );
  const pendingIncome = orderIncomeTransactions.find(
    (transaction) => transaction.status === WalletTransactionStatus.PENDING,
  );

  if (pendingIncome) {
    await tx.walletTransaction.update({
      where: { id: pendingIncome.id },
      data: {
        status: WalletTransactionStatus.FAILED,
        description: `Order ${refund.order.orderCode} direfund customer`,
      },
    });
  }

  if (!completedIncome) {
    return;
  }

  const refundReference = `REFUND-${refund.order.orderCode}`;
  const existingDeduction = await tx.walletTransaction.findFirst({
    where: {
      restaurantId: refund.order.restaurantId,
      type: WalletTransactionType.REFUND_DEDUCTION,
      reference: refundReference,
    },
  });

  if (existingDeduction) {
    return;
  }

  await tx.walletTransaction.create({
    data: {
      restaurantId: refund.order.restaurantId,
      type: WalletTransactionType.REFUND_DEDUCTION,
      status: WalletTransactionStatus.COMPLETED,
      amount: -refund.amount,
      reference: refundReference,
      description: `Deduksi refund order ${refund.order.orderCode}`,
    },
  });
}

export async function GET(_request: Request, { params }: RefundDetailRouteProps) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const refund = await prisma.refundRequest.findFirst({
    where: {
      OR: [{ id }, { order: { orderCode: id } }],
    },
    include: {
      customer: true,
      evidence: { include: { asset: true } },
      order: {
        include: {
          items: true,
          restaurant: { include: { owner: true } },
        },
      },
    },
  });

  if (!refund) {
    return NextResponse.json(
      { ok: false, message: "Refund tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, refund });
}

export async function PATCH(
  request: Request,
  { params }: RefundDetailRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const parsed = updateRefundSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status refund tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existingRefund = await prisma.refundRequest.findFirst({
    where: { OR: [{ id }, { order: { orderCode: id } }] },
    include: {
      customer: true,
      order: {
        include: {
          restaurant: {
            include: {
              owner: true,
            },
          },
        },
      },
    },
  });

  if (!existingRefund) {
    return NextResponse.json(
      { ok: false, message: "Refund tidak ditemukan." },
      { status: 404 },
    );
  }

  if (
    parsed.data.status === RefundStatus.PAID &&
    existingRefund.status !== RefundStatus.APPROVED
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Refund harus disetujui dulu sebelum ditandai dibayarkan.",
      },
      { status: 400 },
    );
  }

  if (
    existingRefund.status === RefundStatus.PAID &&
    parsed.data.status !== RefundStatus.PAID
  ) {
    return NextResponse.json(
      { ok: false, message: "Refund yang sudah dibayar tidak bisa diubah lagi." },
      { status: 400 },
    );
  }

  const refund = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const updatedRefund = await tx.refundRequest.update({
      where: { id: existingRefund.id },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote,
        reviewedAt:
          parsed.data.status === RefundStatus.APPROVED ||
          parsed.data.status === RefundStatus.REJECTED
            ? new Date()
            : undefined,
        paidAt: parsed.data.status === RefundStatus.PAID ? new Date() : undefined,
      },
      include: {
        customer: true,
        order: {
          include: {
            restaurant: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (parsed.data.status === RefundStatus.PAID) {
      await tx.order.update({
        where: { id: updatedRefund.orderId },
        data: {
          status: OrderStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });
      await applyPaidRefundWalletEffect(tx, updatedRefund);
    }

    await tx.notification.create({
      data: {
        userId: updatedRefund.customerId,
        type: NotificationType.REFUND,
        title:
          parsed.data.status === RefundStatus.PAID
            ? "Refund sudah dibayarkan"
            : parsed.data.status === RefundStatus.APPROVED
              ? "Refund disetujui"
              : parsed.data.status === RefundStatus.REJECTED
                ? "Refund ditolak"
                : "Refund sedang ditinjau",
        body:
          parsed.data.status === RefundStatus.PAID
            ? `${updatedRefund.order.orderCode} sudah ditandai refund dibayarkan.`
            : parsed.data.adminNote ||
              `Status refund ${updatedRefund.order.orderCode}: ${parsed.data.status}.`,
        href: `/orders/${updatedRefund.order.orderCode}/refund`,
      },
    });

    if (parsed.data.status === RefundStatus.PAID) {
      await tx.notification.create({
        data: {
          userId: updatedRefund.order.restaurant.ownerId,
          type: NotificationType.REFUND,
          title: "Wallet terkena refund",
          body: `Refund ${updatedRefund.order.orderCode} dibayarkan. Saldo wallet akan disesuaikan.`,
          href: "/owner/wallet",
        },
      });
    }

    await tx.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: `REFUND_${parsed.data.status}`,
        targetType: "refund_request",
        targetId: updatedRefund.id,
        metadata: { adminNote: parsed.data.adminNote },
      },
    });

    return updatedRefund;
  });

  return NextResponse.json({ ok: true, refund });
}
