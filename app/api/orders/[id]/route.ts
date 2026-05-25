import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { expireNoShowOrders } from "@/lib/order-no-show";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";

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
});

function normalizePickupCode(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAID]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.NO_SHOW]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.PAYMENT_FAILED]: [],
  };

  return allowedNextStatuses[currentStatus]?.includes(nextStatus) ?? false;
}

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
      review: true,
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

  const updatedOrder = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      if (
        nextStatus === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        await restoreOrderStock(tx, order.items);
      }

      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          paymentStatus:
            nextStatus === OrderStatus.CANCELLED
              ? PaymentStatus.REFUNDED
              : order.paymentStatus,
          completedAt:
            nextStatus === OrderStatus.COMPLETED ? new Date() : undefined,
          cancelledAt:
            nextStatus === OrderStatus.CANCELLED ? new Date() : undefined,
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

      if (nextStatus === OrderStatus.COMPLETED) {
        await tx.walletTransaction.updateMany({
          where: {
            restaurantId: order.restaurantId,
            type: WalletTransactionType.ORDER_INCOME,
            reference: order.orderCode,
          },
          data: {
            status: WalletTransactionStatus.COMPLETED,
            description: `Order ${order.orderCode} selesai`,
          },
        });
      }

      if (nextStatus === OrderStatus.CANCELLED) {
        await tx.walletTransaction.updateMany({
          where: {
            restaurantId: order.restaurantId,
            type: WalletTransactionType.ORDER_INCOME,
            reference: order.orderCode,
          },
          data: {
            status: WalletTransactionStatus.FAILED,
            description: `Order ${order.orderCode} dibatalkan`,
          },
        });
      }

      return nextOrder;
    },
  );

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.ORDER,
      title:
        nextStatus === OrderStatus.CANCELLED
          ? "Pesanan dibatalkan"
          : "Status pesanan diperbarui",
      body:
        nextStatus === OrderStatus.CANCELLED
          ? `${order.orderCode} tidak bisa diproses oleh ${order.restaurant.name}.`
          : `${order.orderCode} sekarang berstatus ${nextStatus.toLowerCase()}.`,
      href: `/orders/${order.orderCode}`,
    },
  });

  return NextResponse.json({ ok: true, order: updatedOrder });
}
