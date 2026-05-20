import {
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
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

interface CancelOrderRouteProps {
  params: Promise<{ id: string }>;
}

const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(120),
  note: z.string().trim().max(500).optional(),
});

const cancellableStatuses = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
]);

async function restoreOrderStock(
  tx: PrismaTransactionClient,
  items: Array<{ menuItemId: string | null; quantity: number }>,
) {
  for (const item of items) {
    if (!item.menuItemId) {
      continue;
    }

    const menuItem = await tx.menuItem.findUnique({
      where: { id: item.menuItemId },
      select: {
        soldCount: true,
        status: true,
      },
    });

    if (!menuItem) {
      continue;
    }

    await tx.menuItem.update({
      where: { id: item.menuItemId },
      data: {
        stock: { increment: item.quantity },
        soldCount: Math.max(0, menuItem.soldCount - item.quantity),
        status:
          menuItem.status === MenuItemStatus.SOLD_OUT
            ? MenuItemStatus.ACTIVE
            : undefined,
      },
    });
  }
}

export async function POST(request: Request, { params }: CancelOrderRouteProps) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = cancelOrderSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data pembatalan tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const updatedOrder = await prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        const order = await tx.order.findFirst({
          where: {
            orderCode: id,
            customerId: session.userId,
          },
          include: {
            customer: true,
            items: true,
            restaurant: {
              include: {
                owner: true,
              },
            },
          },
        });

        if (!order) {
          throw new Error("Order tidak ditemukan.");
        }

        if (!cancellableStatuses.has(order.status)) {
          throw new Error(
            order.status === OrderStatus.READY
              ? "Pesanan sudah siap diambil. Ajukan refund manual dari halaman refund."
              : "Pesanan tidak bisa dibatalkan pada status ini.",
          );
        }

        await restoreOrderStock(tx, order.items);

        const nextOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus:
              order.paymentStatus === PaymentStatus.PAID
                ? PaymentStatus.REFUNDED
                : order.paymentStatus,
            cancelledAt: new Date(),
          },
          include: {
            customer: true,
            items: {
              include: {
                menuItem: true,
              },
            },
            refundRequest: true,
            restaurant: {
              include: {
                owner: true,
              },
            },
            review: true,
          },
        });

        await tx.walletTransaction.updateMany({
          where: {
            restaurantId: order.restaurantId,
            type: WalletTransactionType.ORDER_INCOME,
            reference: order.orderCode,
          },
          data: {
            status: WalletTransactionStatus.FAILED,
            description: `Order ${order.orderCode} dibatalkan customer`,
          },
        });

        const cancellationDetail = parsed.data.note
          ? `${parsed.data.reason}. Catatan: ${parsed.data.note}`
          : parsed.data.reason;

        await tx.notification.createMany({
          data: [
            {
              userId: order.customerId,
              type: NotificationType.ORDER,
              title: "Pesanan dibatalkan",
              body: `${order.orderCode} berhasil dibatalkan. Alasan: ${cancellationDetail}.`,
              href: `/orders/${order.orderCode}`,
            },
            {
              userId: order.restaurant.ownerId,
              type: NotificationType.ORDER,
              title: "Order dibatalkan customer",
              body: `${order.customer.name} membatalkan ${order.orderCode}. Alasan: ${cancellationDetail}.`,
              href: `/owner/orders/${order.orderCode}`,
            },
          ],
        });

        return nextOrder;
      },
    );

    return NextResponse.json({ ok: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Pesanan gagal dibatalkan.",
      },
      { status: 400 },
    );
  }
}
