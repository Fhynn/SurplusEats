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
import { createManyNotificationsAndDeliver } from "@/lib/notification-delivery";
import { expireNoShowOrders } from "@/lib/order-no-show";
import {
  getOrderStatusLabel,
  isValidOrderStatusTransition,
} from "@/lib/order-status-flow";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { invalidateCacheTags } from "@/lib/server-cache";
import { transitionOrderIncomeWalletTransaction } from "@/lib/wallet-integrity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkOrderStatusSchema = z.object({
  orderCodes: z
    .array(z.string().trim().min(1).max(40))
    .min(1)
    .max(50)
    .transform((codes) => Array.from(new Set(codes))),
  status: z.enum([
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.CANCELLED,
  ]),
});

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

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || (session.role !== UserRole.OWNER && session.role !== UserRole.ADMIN)) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.ownerOrderMutation,
    session,
    ["bulk"],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = bulkOrderStatusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data bulk order tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  await expireNoShowOrders();

  const { orderCodes, status: nextStatus } = parsed.data;
  const orders = await prisma.order.findMany({
    where: {
      orderCode: { in: orderCodes },
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: true,
      items: true,
      restaurant: true,
    },
  });
  const foundOrderCodes = new Set(orders.map((order) => order.orderCode));
  const missingOrderCodes = orderCodes.filter((orderCode) => !foundOrderCodes.has(orderCode));

  if (missingOrderCodes.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `Order tidak ditemukan atau bukan milik restoran ini: ${missingOrderCodes.join(", ")}.`,
      },
      { status: 404 },
    );
  }

  const invalidOrder = orders.find(
    (order) => !isValidOrderStatusTransition(order.status, nextStatus),
  );

  if (invalidOrder) {
    return NextResponse.json(
      {
        ok: false,
        message: `Order ${invalidOrder.orderCode} tidak bisa diubah dari ${invalidOrder.status} ke ${nextStatus}.`,
      },
      { status: 400 },
    );
  }

  const unpaidOrder = orders.find(
    (order) => order.paymentStatus !== PaymentStatus.PAID,
  );

  if (unpaidOrder) {
    return NextResponse.json(
      {
        ok: false,
        message: `Order ${unpaidOrder.orderCode} belum dibayar dan tidak boleh diproses.`,
      },
      { status: 400 },
    );
  }

  const transactionResult = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const now = new Date();
      const nextOrders = [];
      const restoredAvailableMenuItemIds = new Set<string>();

      for (const order of orders) {
        if (
          nextStatus === OrderStatus.CANCELLED &&
          order.status !== OrderStatus.CANCELLED
        ) {
          const restoredIds = await restoreOrderStock(tx, order.items);

          for (const restoredId of restoredIds) {
            restoredAvailableMenuItemIds.add(restoredId);
          }
        }

        const orderTransition = await tx.order.updateMany({
          where: {
            id: order.id,
            status: order.status,
            paymentStatus: PaymentStatus.PAID,
          },
          data: {
            status: nextStatus,
            paymentStatus:
              nextStatus === OrderStatus.CANCELLED
                ? PaymentStatus.REFUNDED
                : order.paymentStatus,
            acceptedAt:
              (nextStatus === OrderStatus.CONFIRMED ||
                nextStatus === OrderStatus.PREPARING) &&
              !order.acceptedAt
                ? now
                : undefined,
            preparingAt:
              nextStatus === OrderStatus.PREPARING && order.status !== nextStatus
                ? now
                : undefined,
            readyAt:
              nextStatus === OrderStatus.READY && order.status !== nextStatus
                ? now
                : undefined,
            cancelledAt:
              nextStatus === OrderStatus.CANCELLED && order.status !== nextStatus
                ? now
                : undefined,
          },
        });

        if (orderTransition.count !== 1) {
          throw new Error(
            `Status order ${order.orderCode} sudah berubah. Muat ulang halaman lalu coba lagi.`,
          );
        }

        const updatedOrder = await tx.order.findUniqueOrThrow({
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

        if (nextStatus === OrderStatus.CANCELLED) {
          await transitionOrderIncomeWalletTransaction(tx, {
            restaurantId: order.restaurantId,
            orderCode: order.orderCode,
            nextStatus: WalletTransactionStatus.FAILED,
            processedAt: now,
            description: `Order ${order.orderCode} dibatalkan`,
          });
        }

        nextOrders.push(updatedOrder);
      }

      return {
        orders: nextOrders,
        restoredAvailableMenuItemIds: Array.from(restoredAvailableMenuItemIds),
      };
    },
    { maxWait: 5_000, timeout: 12_000 },
  );
  const updatedOrders = transactionResult.orders;
  const ownerAnalyticsTags = Array.from(
    new Set(
      updatedOrders.map((order) => `owner-analytics:${order.restaurant.ownerId}`),
    ),
  );

  await invalidateCacheTags([
    "admin-dashboard",
    ...ownerAnalyticsTags,
    ...(transactionResult.restoredAvailableMenuItemIds.length > 0
      ? ["menu-items:public"]
      : []),
  ]);

  await createManyNotificationsAndDeliver(
    updatedOrders.map((order) => ({
      userId: order.customerId,
      type: NotificationType.ORDER,
      title:
        nextStatus === OrderStatus.CANCELLED
          ? "Pesanan dibatalkan"
          : "Status pesanan diperbarui",
      body:
        nextStatus === OrderStatus.CANCELLED
          ? `${order.orderCode} tidak bisa diproses oleh ${order.restaurant.name}.`
          : `${order.orderCode} sekarang berstatus ${getOrderStatusLabel(nextStatus)}.`,
      href: `/orders/${order.orderCode}`,
    })),
  );

  if (transactionResult.restoredAvailableMenuItemIds.length > 0) {
    await notifyFavoriteMenuItemsAvailableByIds(
      transactionResult.restoredAvailableMenuItemIds,
    ).catch((error: unknown) => {
      console.warn("Bulk order favorite restock notification failed", error);
    });
  }

  return NextResponse.json({
    ok: true,
    updatedCount: updatedOrders.length,
    orders: updatedOrders,
  });
}
