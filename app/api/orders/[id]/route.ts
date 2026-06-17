import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { notifyFavoriteMenuItemsAvailableByIds } from "@/lib/favorite-menu-notifications";
import { createNotificationAndDeliver } from "@/lib/notification-delivery";
import { expireNoShowOrders } from "@/lib/order-no-show";
import {
  getOrderStatusLabel,
  isValidOrderStatusTransition,
  normalizePickupCode,
  type PickupVerificationMethod,
} from "@/lib/order-status-flow";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { invalidateCacheTags } from "@/lib/server-cache";
import {
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  UserRole,
  WalletTransactionStatus,
} from "@prisma/client";
import { transitionOrderIncomeWalletTransaction } from "@/lib/wallet-integrity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderDetailRouteProps {
  params: Promise<{ id: string }>;
}

const updateOrderStatusSchema = z.object({
  status: z.enum([
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ]),
  pickupCode: z.string().trim().max(20).optional(),
  pickupVerificationMethod: z
    .enum(["SCANNER", "MANUAL", "SCANNER_OR_MANUAL"])
    .optional(),
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

export async function GET(_request: Request, { params }: OrderDetailRouteProps) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk melihat order." },
      { status: 401 },
    );
  }

  await expireNoShowOrders();

  const order = await prisma.order.findFirst({
    where: {
      orderCode: id,
      customerId: session.role === UserRole.CUSTOMER ? session.userId : undefined,
      paymentStatus:
        session.role === UserRole.OWNER
          ? { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] }
          : undefined,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
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

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    order:
      session.role === UserRole.OWNER ? { ...order, pickupCode: null } : order,
  });
}

export async function PATCH(request: Request, { params }: OrderDetailRouteProps) {
  const { id } = await params;
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
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = updateOrderStatusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status order tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await expireNoShowOrders();

  const order = await prisma.order.findFirst({
    where: {
      orderCode: id,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: true,
      items: true,
      restaurant: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const nextStatus = parsed.data.status;

  if (order.paymentStatus !== PaymentStatus.PAID) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Order belum dibayar melalui Tripay dan belum boleh diproses.",
      },
      { status: 400 },
    );
  }

  if (!isValidOrderStatusTransition(order.status, nextStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message: `Status order tidak bisa diubah dari ${order.status} ke ${nextStatus}.`,
      },
      { status: 400 },
    );
  }

  if (nextStatus === OrderStatus.COMPLETED) {
    if (order.status !== OrderStatus.READY) {
      return NextResponse.json(
        {
          ok: false,
          message: "Order harus ditandai siap diambil dulu sebelum pickup selesai.",
        },
        { status: 400 },
      );
    }

    const expectedPickupCode = normalizePickupCode(order.pickupCode);
    const submittedPickupCode = normalizePickupCode(parsed.data.pickupCode);

    if (!expectedPickupCode) {
      return NextResponse.json(
        { ok: false, message: "Kode pickup order belum tersedia." },
        { status: 400 },
      );
    }

    if (!submittedPickupCode) {
      return NextResponse.json(
        { ok: false, message: "Kode pickup wajib diisi untuk menyelesaikan order." },
        { status: 400 },
      );
    }

    if (submittedPickupCode !== expectedPickupCode) {
      return NextResponse.json(
        { ok: false, message: "Kode pickup tidak cocok." },
        { status: 400 },
      );
    }
  }

  let restoredAvailableMenuItemIds: string[] = [];
  const updatedOrder = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const now = new Date();
      const pickupVerificationMethod: PickupVerificationMethod =
        parsed.data.pickupVerificationMethod ?? "SCANNER_OR_MANUAL";

      if (
        nextStatus === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        restoredAvailableMenuItemIds = await restoreOrderStock(tx, order.items);
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
          preparingAt: nextStatus === OrderStatus.PREPARING ? now : undefined,
          readyAt: nextStatus === OrderStatus.READY ? now : undefined,
          pickupVerifiedAt:
            nextStatus === OrderStatus.COMPLETED ? now : undefined,
          pickupVerifiedBy:
            nextStatus === OrderStatus.COMPLETED ? session.name : undefined,
          pickupVerificationMethod:
            nextStatus === OrderStatus.COMPLETED
              ? pickupVerificationMethod
              : undefined,
          completedAt:
            nextStatus === OrderStatus.COMPLETED ? now : undefined,
          cancelledAt:
            nextStatus === OrderStatus.CANCELLED ? now : undefined,
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

      if (nextStatus === OrderStatus.COMPLETED) {
        await transitionOrderIncomeWalletTransaction(tx, {
          restaurantId: order.restaurantId,
          orderCode: order.orderCode,
          nextStatus: WalletTransactionStatus.COMPLETED,
          processedAt: now,
          description: `Order ${order.orderCode} selesai`,
        });
      }

      if (nextStatus === OrderStatus.CANCELLED) {
        await transitionOrderIncomeWalletTransaction(tx, {
          restaurantId: order.restaurantId,
          orderCode: order.orderCode,
          nextStatus: WalletTransactionStatus.FAILED,
          processedAt: now,
          description: `Order ${order.orderCode} dibatalkan`,
        });
      }

      return nextOrder;
    },
  );

  await invalidateCacheTags([
    "admin-dashboard",
    `owner-analytics:${updatedOrder.restaurant.ownerId}`,
    ...(restoredAvailableMenuItemIds.length > 0 ? ["menu-items:public"] : []),
  ]);

  await createNotificationAndDeliver({
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
  });

  if (restoredAvailableMenuItemIds.length > 0) {
    await notifyFavoriteMenuItemsAvailableByIds(
      restoredAvailableMenuItemIds,
    ).catch((error: unknown) => {
      console.warn("Cancelled order favorite restock notification failed", error);
    });
  }

  return NextResponse.json({ ok: true, order: updatedOrder });
}
