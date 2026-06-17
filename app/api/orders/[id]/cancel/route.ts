import {
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  UserRole,
  WalletTransactionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { notifyFavoriteMenuItemsAvailableByIds } from "@/lib/favorite-menu-notifications";
import { deliverNotifications } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { transitionOrderIncomeWalletTransaction } from "@/lib/wallet-integrity";

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
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
]);

async function restoreOrderStock(
  tx: PrismaTransactionClient,
  items: Array<{ menuItemId: string | null; quantity: number }>,
) {
  const restoredAvailableMenuItemIds: string[] = [];

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

    if (menuItem.status === MenuItemStatus.SOLD_OUT) {
      restoredAvailableMenuItemIds.push(item.menuItemId);
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

  return restoredAvailableMenuItemIds;
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

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.customerOrderCancel,
    session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
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
    const cancellationDetail = parsed.data.note
      ? `${parsed.data.reason}. Catatan: ${parsed.data.note}`
      : parsed.data.reason;

    let restoredAvailableMenuItemIds: string[] = [];
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
            order.status === OrderStatus.PENDING
              ? "Pembayaran masih menunggu konfirmasi Tripay dan belum dapat dibatalkan dari order."
              : order.status === OrderStatus.READY
              ? "Pesanan sudah siap diambil. Ajukan refund manual dari halaman refund."
              : "Pesanan tidak bisa dibatalkan pada status ini.",
          );
        }

        if (order.paymentStatus !== PaymentStatus.PAID) {
          throw new Error("Order belum dibayar dan belum dapat dibatalkan dari halaman ini.");
        }

        const now = new Date();
        restoredAvailableMenuItemIds = await restoreOrderStock(tx, order.items);

        const orderTransition = await tx.order.updateMany({
          where: {
            id: order.id,
            customerId: session.userId,
            status: order.status,
            paymentStatus: PaymentStatus.PAID,
          },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.REFUNDED,
            cancelledAt: now,
          },
        });

        if (orderTransition.count !== 1) {
          throw new Error("Status order sudah berubah. Muat ulang halaman lalu coba lagi.");
        }

        const nextOrder = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
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
            review: {
              include: {
                images: {
                  include: {
                    asset: true,
                  },
                },
              },
            },
          },
        });

        await transitionOrderIncomeWalletTransaction(tx, {
          restaurantId: order.restaurantId,
          orderCode: order.orderCode,
          nextStatus: WalletTransactionStatus.FAILED,
          processedAt: now,
          description: `Order ${order.orderCode} dibatalkan customer`,
        });

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

    await deliverNotifications([
      {
        userId: updatedOrder.customerId,
        type: NotificationType.ORDER,
        title: "Pesanan dibatalkan",
        body: `${updatedOrder.orderCode} berhasil dibatalkan. Alasan: ${cancellationDetail}.`,
        href: `/orders/${updatedOrder.orderCode}`,
      },
      {
        userId: updatedOrder.restaurant.ownerId,
        type: NotificationType.ORDER,
        title: "Order dibatalkan customer",
        body: `${updatedOrder.customer.name} membatalkan ${updatedOrder.orderCode}. Alasan: ${cancellationDetail}.`,
        href: `/owner/orders/${updatedOrder.orderCode}`,
      },
    ]);

    if (restoredAvailableMenuItemIds.length > 0) {
      await notifyFavoriteMenuItemsAvailableByIds(
        restoredAvailableMenuItemIds,
      ).catch((error: unknown) => {
        console.warn("Customer cancel favorite restock notification failed", error);
      });
    }

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
