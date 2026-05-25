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
import { createOrderCode, createPickupCode } from "@/lib/backend-utils";
import { expireNoShowOrders } from "@/lib/order-no-show";
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

type CheckoutItem = z.infer<typeof checkoutSchema>["items"][number];

function normalizeCheckoutItems(items: CheckoutItem[]) {
  const itemsByMenuId = new Map<string, CheckoutItem>();

  for (const item of items) {
    const existingItem = itemsByMenuId.get(item.menuItemId);

    itemsByMenuId.set(item.menuItemId, {
      menuItemId: item.menuItemId,
      quantity: (existingItem?.quantity ?? 0) + item.quantity,
    });
  }

  return Array.from(itemsByMenuId.values());
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const checkoutTransactionOptions = {
  maxWait: 5_000,
  timeout: 12_000,
};

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

  await expireNoShowOrders();

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
  const checkoutItems = normalizeCheckoutItems(data.items);

  if (checkoutItems.some((item) => item.quantity > 20)) {
    return NextResponse.json(
      { ok: false, message: "Jumlah per menu maksimal 20 item." },
      { status: 400 },
    );
  }

  const [customer, activeCustomerLocation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.address.findFirst({
      where: {
        userId: session.userId,
        isPrimary: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { id: true },
    }),
  ]);

  if (!customer) {
    return NextResponse.json(
      { ok: false, message: "Customer tidak ditemukan." },
      { status: 404 },
    );
  }

  if (!activeCustomerLocation) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Aktifkan lokasi customer dulu sebelum checkout agar rute pickup memakai titik yang benar.",
      },
      { status: 400 },
    );
  }

  const requestedIds = checkoutItems.map((item) => item.menuItemId);
  const voucherCode = data.voucherCode?.trim().toUpperCase();

  try {
    const checkoutResult = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: requestedIds },
          status: MenuItemStatus.ACTIVE,
        },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          discountedPrice: true,
          originalPrice: true,
          stock: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });
      const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
      const restaurantById = new Map(
        menuItems.map((item) => [item.restaurantId, item.restaurant]),
      );

      if (menuItems.length !== requestedIds.length) {
        throw new Error("Sebagian menu tidak tersedia.");
      }

      const restaurantsWithoutLocation = Array.from(
        new Set(
          menuItems
            .filter(
              (item) =>
                item.restaurant.latitude === null ||
                item.restaurant.longitude === null,
            )
            .map((item) => item.restaurant.name),
        ),
      );

      if (restaurantsWithoutLocation.length > 0) {
        throw new Error(
          `${restaurantsWithoutLocation.join(", ")} belum punya titik lokasi. Mitra wajib melengkapi lokasi toko sebelum menerima order.`,
        );
      }

      for (const cartItem of checkoutItems) {
        const menuItem = menuItemById.get(cartItem.menuItemId);

        if (!menuItem || menuItem.stock < cartItem.quantity) {
          throw new Error(`${menuItem?.name || "Menu"} stok tidak cukup.`);
        }
      }

      const subtotal = checkoutItems.reduce((total, cartItem) => {
        const menuItem = menuItemById.get(cartItem.menuItemId);
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
            `Minimum transaksi voucher adalah ${formatRupiah(voucher.minSpend)}.`,
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

      const checkoutItemsByRestaurant = new Map<string, CheckoutItem[]>();

      for (const cartItem of checkoutItems) {
        const menuItem = menuItemById.get(cartItem.menuItemId);

        if (!menuItem) {
          throw new Error("Menu tidak ditemukan.");
        }

        checkoutItemsByRestaurant.set(menuItem.restaurantId, [
          ...(checkoutItemsByRestaurant.get(menuItem.restaurantId) ?? []),
          cartItem,
        ]);
      }

      const groupedCheckoutItems = Array.from(checkoutItemsByRestaurant.entries())
        .map(([restaurantId, items]) => {
          const groupSubtotal = items.reduce((total, cartItem) => {
            const menuItem = menuItemById.get(cartItem.menuItemId);

            return total + (menuItem?.discountedPrice || 0) * cartItem.quantity;
          }, 0);

          return {
            restaurantId,
            items,
            subtotal: groupSubtotal,
          };
        })
        .sort((firstGroup, secondGroup) => secondGroup.subtotal - firstGroup.subtotal);

      let remainingVoucherDiscount = voucherDiscount;
      let serviceFeeApplied = false;
      let voucherRedemptionOrderId: string | null = null;
      const createdOrders = [];
      const walletTransactions: Array<{
        restaurantId: string;
        type: WalletTransactionType;
        status: WalletTransactionStatus;
        amount: number;
        reference: string;
        description: string;
      }> = [];
      const notificationPayloads: Array<{
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        href: string;
      }> = [];

      for (const group of groupedCheckoutItems) {
        const groupDiscount = Math.min(remainingVoucherDiscount, group.subtotal);
        remainingVoucherDiscount -= groupDiscount;
        const groupServiceFee = serviceFeeApplied ? 0 : serviceFee;
        serviceFeeApplied = true;
        const groupTotal = Math.max(0, group.subtotal - groupDiscount) + groupServiceFee;
        const merchantIncome = Math.max(0, groupTotal - groupServiceFee);
        const orderCode = createOrderCode();

        const createdOrder = await tx.order.create({
          data: {
            orderCode,
            customerId: customer.id,
            restaurantId: group.restaurantId,
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            subtotal: group.subtotal,
            discount: groupDiscount,
            serviceFee: groupServiceFee,
            total: groupTotal,
            pickupCode: createPickupCode(),
            pickupTime: new Date(Date.now() + 1000 * 60 * 60),
            note: data.note,
            paidAt: new Date(),
            items: {
              create: group.items.map((cartItem) => {
                const menuItem = menuItemById.get(cartItem.menuItemId);

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

        if (appliedVoucherClaimId && groupDiscount > 0 && !voucherRedemptionOrderId) {
          voucherRedemptionOrderId = createdOrder.id;
        }

        walletTransactions.push({
          restaurantId: group.restaurantId,
          type: WalletTransactionType.ORDER_INCOME,
          status: WalletTransactionStatus.PENDING,
          amount: merchantIncome,
          reference: orderCode,
          description: `Order ${orderCode} dari ${customer.name}`,
        });

        for (const cartItem of group.items) {
          const menuItem = menuItemById.get(cartItem.menuItemId);

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
        }

        const ownerId = restaurantById.get(group.restaurantId)?.ownerId;

        notificationPayloads.push({
          userId: customer.id,
          type: NotificationType.ORDER,
          title:
            groupedCheckoutItems.length > 1
              ? "Pesanan marketplace berhasil dibuat"
              : "Pesanan berhasil dibuat",
          body: `${orderCode} sedang diproses oleh ${createdOrder.restaurant.name}.`,
          href: `/orders/${orderCode}`,
        });

        if (ownerId) {
          notificationPayloads.push({
            userId: ownerId,
            type: NotificationType.ORDER,
            title: "Order baru masuk",
            body: `${customer.name} membuat order ${orderCode}.`,
            href: "/owner/dashboard?tab=orders",
          });
        }

        createdOrders.push(createdOrder);
      }

      await tx.menuItem.updateMany({
        where: {
          id: { in: requestedIds },
          status: MenuItemStatus.ACTIVE,
          stock: { lte: 0 },
        },
        data: { status: MenuItemStatus.SOLD_OUT },
      });

      if (walletTransactions.length > 0) {
        await tx.walletTransaction.createMany({
          data: walletTransactions,
        });
      }

      if (appliedVoucherClaimId && voucherRedemptionOrderId) {
        await tx.voucherRedemption.update({
          where: { id: appliedVoucherClaimId },
          data: {
            orderId: voucherRedemptionOrderId,
            redeemedAt: new Date(),
          },
        });
      }

      return {
        notifications: notificationPayloads,
        orders: createdOrders,
      };
    }, checkoutTransactionOptions);

    const postCheckoutTasks: Promise<unknown>[] = [
      prisma.cartItem.deleteMany({
        where: {
          userId: customer.id,
          menuItemId: { in: requestedIds },
        },
      }),
    ];

    if (checkoutResult.notifications.length > 0) {
      postCheckoutTasks.push(
        prisma.notification.createMany({
          data: checkoutResult.notifications,
        }),
      );
    }

    const postCheckoutResults = await Promise.allSettled(postCheckoutTasks);

    for (const result of postCheckoutResults) {
      if (result.status === "rejected") {
        console.warn("Post-checkout task failed", result.reason);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        order: checkoutResult.orders[0],
        orders: checkoutResult.orders,
      },
      { status: 201 },
    );
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
