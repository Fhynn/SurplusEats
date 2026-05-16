import {
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { createOrderCode } from "@/lib/backend-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  customerEmail: z.string().email().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .min(1),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getCurrentSession();
  const customerEmail = url.searchParams.get("customerEmail");
  const ownerEmail = url.searchParams.get("ownerEmail");

  const orders = await prisma.order.findMany({
    where: {
      customer:
        customerEmail || session?.role === "CUSTOMER"
          ? { email: customerEmail || session?.email }
          : undefined,
      restaurant:
        ownerEmail || session?.role === "OWNER"
          ? { owner: { email: ownerEmail || session?.email } }
          : undefined,
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
      refundRequest: true,
      restaurant: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, orders });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk checkout." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data checkout tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const customer = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!customer) {
    return NextResponse.json(
      { ok: false, message: "Customer tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const requestedIds = data.items.map((item) => item.menuItemId);
      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: requestedIds },
          status: MenuItemStatus.ACTIVE,
        },
        include: {
          restaurant: {
            include: {
              owner: true,
            },
          },
        },
      });

      if (menuItems.length !== requestedIds.length) {
        throw new Error("Sebagian menu tidak tersedia.");
      }

      const restaurantId = menuItems[0].restaurantId;
      const hasMixedRestaurant = menuItems.some(
        (item) => item.restaurantId !== restaurantId,
      );

      if (hasMixedRestaurant) {
        throw new Error("Checkout sementara hanya mendukung satu restoran.");
      }

      for (const cartItem of data.items) {
        const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);

        if (!menuItem || menuItem.stock < cartItem.quantity) {
          throw new Error(`${menuItem?.name || "Menu"} stok tidak cukup.`);
        }
      }

      const subtotal = data.items.reduce((total, cartItem) => {
        const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);
        return total + (menuItem?.discountedPrice || 0) * cartItem.quantity;
      }, 0);
      const serviceFee = 2000;
      const total = subtotal + serviceFee;
      const orderCode = createOrderCode();

      const createdOrder = await tx.order.create({
        data: {
          orderCode,
          customerId: customer.id,
          restaurantId,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          subtotal,
          serviceFee,
          total,
          pickupCode: Math.floor(100000 + Math.random() * 900000).toString(),
          pickupTime: new Date(Date.now() + 1000 * 60 * 60),
          note: data.note,
          paidAt: new Date(),
          items: {
            create: data.items.map((cartItem) => {
              const menuItem = menuItems.find(
                (item) => item.id === cartItem.menuItemId,
              );

              if (!menuItem) {
                throw new Error("Menu tidak ditemukan.");
              }

              return {
                menuItemId: menuItem.id,
                menuNameSnapshot: menuItem.name,
                restaurantSnapshot: menuItem.restaurant.name,
                priceSnapshot: menuItem.discountedPrice,
                originalPriceSnapshot: menuItem.originalPrice,
                quantity: cartItem.quantity,
              };
            }),
          },
        },
        include: {
          items: true,
          restaurant: true,
        },
      });

      for (const cartItem of data.items) {
        const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);
        const nextStock = Math.max((menuItem?.stock || 0) - cartItem.quantity, 0);

        await tx.menuItem.update({
          where: { id: cartItem.menuItemId },
          data: {
            stock: { decrement: cartItem.quantity },
            soldCount: { increment: cartItem.quantity },
            status:
              nextStock === 0 ? MenuItemStatus.SOLD_OUT : MenuItemStatus.ACTIVE,
          },
        });
      }

      const ownerId = menuItems[0].restaurant.ownerId;
      await tx.notification.createMany({
        data: [
          {
            userId: customer.id,
            type: NotificationType.ORDER,
            title: "Pesanan berhasil dibuat",
            body: `${orderCode} sedang diproses oleh ${createdOrder.restaurant.name}.`,
            href: `/orders/${orderCode}`,
          },
          {
            userId: ownerId,
            type: NotificationType.ORDER,
            title: "Order baru masuk",
            body: `${customer.name} membuat order ${orderCode}.`,
            href: "/owner/dashboard?tab=orders",
          },
        ],
      });

      return createdOrder;
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Checkout gagal.",
      },
      { status: 400 },
    );
  }
}
