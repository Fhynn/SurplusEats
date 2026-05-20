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
import { createOrderCode } from "@/lib/backend-utils";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

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
  voucherCode: z.string().trim().min(1).max(40).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getCurrentSession();
  const customerEmail = url.searchParams.get("customerEmail");
  const ownerEmail = url.searchParams.get("ownerEmail");

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk melihat pesanan." },
      { status: 401 },
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      customer:
        session.role === UserRole.CUSTOMER
          ? { id: session.userId }
          : session.role === UserRole.ADMIN && customerEmail
            ? { email: customerEmail }
          : undefined,
      restaurant:
        session.role === UserRole.OWNER
          ? { ownerId: session.userId }
          : session.role === UserRole.ADMIN && ownerEmail
            ? { owner: { email: ownerEmail } }
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

  const customerPickupAddress = await prisma.address.findFirst({
    where: {
      userId: customer.id,
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  if (!customerPickupAddress) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Checkout wajib memakai alamat customer dengan titik maps. Tambahkan alamat dan klik Ambil Lokasi dulu.",
      },
      { status: 400 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const requestedIds = data.items.map((item) => item.menuItemId);
      const voucherCode = data.voucherCode?.trim().toUpperCase();
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

      if (
        menuItems[0].restaurant.latitude === null ||
        menuItems[0].restaurant.longitude === null
      ) {
        throw new Error(
          "Restoran belum punya titik lokasi. Mitra wajib melengkapi lokasi toko sebelum menerima order.",
        );
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
      let voucherDiscount = 0;
      let appliedVoucherClaimId: string | null = null;

      if (voucherCode) {
        const now = new Date();
        const voucher = await tx.voucher.findFirst({
          where: {
            code: voucherCode,
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
        });

        if (!voucher) {
          throw new Error("Voucher tidak valid atau sudah tidak berlaku.");
        }

        if (subtotal < voucher.minSpend) {
          throw new Error(
            `Minimum transaksi voucher adalah ${new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(voucher.minSpend)}.`,
          );
        }

        const existingRedemption = await tx.voucherRedemption.findFirst({
          where: {
            voucherId: voucher.id,
            userId: customer.id,
            orderId: { not: null },
          },
        });

        if (existingRedemption) {
          throw new Error("Voucher sudah pernah dipakai oleh akun ini.");
        }

        const voucherClaim = await tx.voucherRedemption.findFirst({
          where: {
            voucherId: voucher.id,
            userId: customer.id,
            orderId: null,
          },
          select: {
            id: true,
          },
        });

        if (!voucherClaim) {
          throw new Error("Klaim voucher dulu sebelum checkout.");
        }

        if (voucher.quota !== null) {
          const usedCount = await tx.voucherRedemption.count({
            where: {
              voucherId: voucher.id,
              orderId: { not: null },
            },
          });

          if (usedCount >= voucher.quota) {
            throw new Error("Kuota voucher sudah habis.");
          }
        }

        voucherDiscount = Math.min(voucher.discount, subtotal);
        appliedVoucherClaimId = voucherClaim.id;
      }

      const total = Math.max(0, subtotal - voucherDiscount) + serviceFee;
      const merchantIncome = Math.max(0, total - serviceFee);
      const orderCode = createOrderCode();

      const createdOrder = await tx.order.create({
        data: {
          orderCode,
          customerId: customer.id,
          restaurantId,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          subtotal,
          discount: voucherDiscount,
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

      if (appliedVoucherClaimId) {
        await tx.voucherRedemption.update({
          where: { id: appliedVoucherClaimId },
          data: {
            orderId: createdOrder.id,
            redeemedAt: new Date(),
          },
        });
      }

      await tx.walletTransaction.create({
        data: {
          restaurantId,
          type: WalletTransactionType.ORDER_INCOME,
          status: WalletTransactionStatus.PENDING,
          amount: merchantIncome,
          reference: orderCode,
          description: `Order ${orderCode} dari ${customer.name}`,
        },
      });

      for (const cartItem of data.items) {
        const menuItem = menuItems.find((item) => item.id === cartItem.menuItemId);

        const stockUpdate = await tx.menuItem.updateMany({
          where: {
            id: cartItem.menuItemId,
            status: MenuItemStatus.ACTIVE,
            stock: { gte: cartItem.quantity },
          },
          data: {
            stock: { decrement: cartItem.quantity },
            soldCount: { increment: cartItem.quantity },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error(`${menuItem?.name || "Menu"} stok tidak cukup.`);
        }

        const updatedMenuItem = await tx.menuItem.findUnique({
          where: { id: cartItem.menuItemId },
          select: { stock: true },
        });

        if (updatedMenuItem?.stock === 0) {
          await tx.menuItem.update({
            where: { id: cartItem.menuItemId },
            data: { status: MenuItemStatus.SOLD_OUT },
          });
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          userId: customer.id,
          menuItemId: { in: requestedIds },
        },
      });

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
