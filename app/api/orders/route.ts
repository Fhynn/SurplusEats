import {
  CheckoutAttemptStatus,
  MenuItemStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { createOrderCode } from "@/lib/backend-utils";
import { expireNoShowOrders } from "@/lib/order-no-show";
import {
  calculateCheckoutFees,
  getPlatformFeeSettings,
} from "@/lib/platform-fees";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createTripayTransaction,
  getTripayCallbackUrl,
  TripayApiError,
} from "@/lib/tripay";
import { invalidateCacheTags } from "@/lib/server-cache";
import {
  lockVoucherRedemption,
  redeemVoucherClaimForOrder,
} from "@/lib/voucher-integrity";
import {
  calculateVoucherEligibility,
  normalizeVoucherCategory,
} from "@/lib/voucher-rules";

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
  paymentMethod: z.string().trim().min(2).max(40),
  voucherCode: z.string().trim().min(1).max(40).optional(),
  idempotencyKey: z.string().trim().min(12).max(120).optional(),
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

const staleCheckoutAttemptMs = 1000 * 60 * 2;

async function findCheckoutAttempt(userId: string, idempotencyKey: string) {
  return prisma.checkoutAttempt.findUnique({
    where: {
      userId_idempotencyKey: {
        userId,
        idempotencyKey,
      },
    },
    include: {
      orders: {
        include: {
          items: true,
          restaurant: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function releaseCheckoutReservation(
  checkoutAttemptId: string,
  errorMessage: string,
) {
  await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const pendingOrders = await tx.order.findMany({
        where: {
          checkoutAttemptId,
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
        },
        include: {
          items: {
            select: {
              menuItemId: true,
              quantity: true,
            },
          },
        },
      });

      for (const order of pendingOrders) {
        for (const item of order.items) {
          if (!item.menuItemId) {
            continue;
          }

          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stock: { increment: item.quantity },
              status: MenuItemStatus.ACTIVE,
            },
          });
        }
      }

      const orderIds = pendingOrders.map((order) => order.id);

      if (orderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: {
            status: OrderStatus.PAYMENT_FAILED,
            paymentStatus: PaymentStatus.FAILED,
          },
        });
        await tx.voucherRedemption.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null },
        });
      }

      await tx.checkoutAttempt.update({
        where: { id: checkoutAttemptId },
        data: {
          status: CheckoutAttemptStatus.FAILED,
          paymentStatus: "FAILED",
          errorMessage: errorMessage.slice(0, 500),
        },
      });
    },
    checkoutTransactionOptions,
  );
}

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
      paymentStatus:
        session.role === UserRole.OWNER
          ? { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] }
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

  const rateLimit = await enforceRateLimit(
    request,
    {
      keyPrefix: "checkout-order",
      max: 15,
      windowMs: 10 * 60 * 1000,
      message: "Terlalu banyak percobaan checkout. Coba lagi beberapa menit lagi.",
      auditAction: "CHECKOUT_RATE_LIMIT_BLOCKED",
    },
    [session.userId],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
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
        email: true,
        phone: true,
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
  const idempotencyKey =
    (data.idempotencyKey || request.headers.get("Idempotency-Key") || "").trim() ||
    randomUUID();
  let checkoutAttemptId: string | null = null;

  try {
    if (idempotencyKey) {
      try {
        const checkoutAttempt = await prisma.checkoutAttempt.create({
          data: {
            userId: customer.id,
            idempotencyKey,
          },
          select: { id: true },
        });

        checkoutAttemptId = checkoutAttempt.id;
      } catch (error) {
        const existingAttempt = await findCheckoutAttempt(customer.id, idempotencyKey);

        if (!existingAttempt) {
          throw error;
        }

        if (
          existingAttempt.status === CheckoutAttemptStatus.COMPLETED &&
          existingAttempt.orders.length > 0
        ) {
          return NextResponse.json(
            {
              ok: true,
              duplicate: true,
              order: existingAttempt.orders[0],
              orders: existingAttempt.orders,
              payment: {
                attemptId: existingAttempt.id,
                reference: existingAttempt.paymentReference,
                status: existingAttempt.paymentStatus,
                checkoutUrl: existingAttempt.paymentCheckoutUrl,
                expiresAt:
                  existingAttempt.paymentExpiresAt?.toISOString() ?? null,
              },
            },
            { status: 200 },
          );
        }

        if (
          existingAttempt.status === CheckoutAttemptStatus.PROCESSING &&
          existingAttempt.paymentCheckoutUrl &&
          existingAttempt.orders.length > 0
        ) {
          return NextResponse.json(
            {
              ok: true,
              duplicate: true,
              order: existingAttempt.orders[0],
              orders: existingAttempt.orders,
              payment: {
                attemptId: existingAttempt.id,
                reference: existingAttempt.paymentReference,
                status: existingAttempt.paymentStatus || "UNPAID",
                checkoutUrl: existingAttempt.paymentCheckoutUrl,
                expiresAt:
                  existingAttempt.paymentExpiresAt?.toISOString() ?? null,
              },
            },
            { status: 200 },
          );
        }

        const isStillProcessing =
          existingAttempt.status === CheckoutAttemptStatus.PROCESSING &&
          Date.now() - existingAttempt.updatedAt.getTime() < staleCheckoutAttemptMs;

        if (isStillProcessing) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Checkout sedang diproses. Jangan klik dua kali, tunggu hasilnya sebentar.",
            },
            { status: 409 },
          );
        }

        if (existingAttempt.orders.length > 0) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Checkout sebelumnya sudah berakhir. Muat ulang halaman lalu coba kembali.",
            },
            { status: 409 },
          );
        }

        const checkoutAttempt = await prisma.checkoutAttempt.update({
          where: { id: existingAttempt.id },
          data: {
            status: CheckoutAttemptStatus.PROCESSING,
            errorMessage: null,
          },
          select: { id: true },
        });

        checkoutAttemptId = checkoutAttempt.id;
      }
    }

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
          category: true,
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

      const platformFeeSettings = await getPlatformFeeSettings(tx);
      const checkoutSubtotal = checkoutItems.reduce((total, cartItem) => {
        const menuItem = menuItemById.get(cartItem.menuItemId);

        return total + (menuItem?.discountedPrice || 0) * cartItem.quantity;
      }, 0);
      let voucherDiscount = 0;
      let appliedVoucherClaimId: string | null = null;
      let appliedVoucherId: string | null = null;
      let appliedVoucherRule: {
        restaurantId: string | null;
        category: string | null;
      } | null = null;

      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: {
            code: voucherCode,
          },
          include: {
            restaurant: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!voucher) {
          throw new Error("Voucher tidak valid atau sudah tidak berlaku.");
        }

        await lockVoucherRedemption(tx, voucher.id);

        const [
          voucherClaim,
          totalUsedCount,
          userUsedCount,
          userOrderCount,
        ] = await Promise.all([
          tx.voucherRedemption.findFirst({
            where: {
              voucherId: voucher.id,
              userId: customer.id,
              orderId: null,
            },
            select: {
              id: true,
            },
          }),
          tx.voucherRedemption.count({
            where: {
              voucherId: voucher.id,
              orderId: { not: null },
            },
          }),
          tx.voucherRedemption.count({
            where: {
              voucherId: voucher.id,
              userId: customer.id,
              orderId: { not: null },
            },
          }),
          tx.order.count({
            where: {
              customerId: customer.id,
              paymentStatus: PaymentStatus.PAID,
            },
          }),
        ]);

        const voucherItems = checkoutItems.map((cartItem) => {
          const menuItem = menuItemById.get(cartItem.menuItemId);

          if (!menuItem) {
            throw new Error("Menu tidak ditemukan.");
          }

          return {
            restaurantId: menuItem.restaurantId,
            category: menuItem.category,
            discountedPrice: menuItem.discountedPrice,
            quantity: cartItem.quantity,
          };
        });

        const eligibility = calculateVoucherEligibility({
          voucher,
          items: voucherItems,
          totalUsedCount,
          userUsedCount,
          userOrderCount,
        });

        if (!eligibility.eligible) {
          throw new Error(
            eligibility.reason ||
              `Minimum transaksi voucher adalah ${formatRupiah(voucher.minSpend)} pada item yang sesuai rules.`,
          );
        }

        if (!voucherClaim) {
          throw new Error("Klaim voucher dulu sebelum checkout.");
        }

        voucherDiscount = eligibility.discount;
        appliedVoucherClaimId = voucherClaim.id;
        appliedVoucherId = voucher.id;
        appliedVoucherRule = {
          restaurantId: voucher.restaurantId,
          category: voucher.category,
        };
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

      const voucherDiscountByRestaurantId = new Map<string, number>();

      if (voucherDiscount > 0 && appliedVoucherRule) {
        let remainingVoucherDiscount = voucherDiscount;
        const voucherCategory = normalizeVoucherCategory(appliedVoucherRule.category);

        for (const group of groupedCheckoutItems) {
          const groupEligibleSubtotal = group.items.reduce((total, cartItem) => {
            const menuItem = menuItemById.get(cartItem.menuItemId);

            if (!menuItem) {
              return total;
            }

            if (
              appliedVoucherRule?.restaurantId &&
              menuItem.restaurantId !== appliedVoucherRule.restaurantId
            ) {
              return total;
            }

            if (
              voucherCategory &&
              normalizeVoucherCategory(menuItem.category) !== voucherCategory
            ) {
              return total;
            }

            return total + menuItem.discountedPrice * cartItem.quantity;
          }, 0);
          const groupDiscount = Math.min(
            remainingVoucherDiscount,
            groupEligibleSubtotal,
          );

          if (groupDiscount > 0) {
            voucherDiscountByRestaurantId.set(group.restaurantId, groupDiscount);
            remainingVoucherDiscount -= groupDiscount;
          }

          if (remainingVoucherDiscount <= 0) {
            break;
          }
        }
      }

      const customerFeeBreakdown = calculateCheckoutFees({
        amount: Math.max(0, checkoutSubtotal - voucherDiscount),
        settings: platformFeeSettings,
      });
      let customerFeeApplied = false;
      let voucherRedemptionOrderId: string | null = null;
      const createdOrders = [];

      for (const group of groupedCheckoutItems) {
        const groupDiscount = voucherDiscountByRestaurantId.get(group.restaurantId) ?? 0;
        const groupNetSubtotal = Math.max(0, group.subtotal - groupDiscount);
        const groupServiceFee = customerFeeApplied
          ? 0
          : customerFeeBreakdown.serviceFee;
        const groupTaxFee = customerFeeApplied ? 0 : customerFeeBreakdown.taxFee;
        customerFeeApplied = true;
        const groupPlatformFee = calculateCheckoutFees({
          amount: groupNetSubtotal,
          settings: platformFeeSettings,
        }).merchantCommission;
        const groupTotal = groupNetSubtotal + groupServiceFee + groupTaxFee;
        const orderCode = createOrderCode();

        const createdOrder = await tx.order.create({
          data: {
            orderCode,
            customerId: customer.id,
            restaurantId: group.restaurantId,
            checkoutAttemptId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal: group.subtotal,
            discount: groupDiscount,
            serviceFee: groupServiceFee,
            taxFee: groupTaxFee,
            platformFee: groupPlatformFee,
            total: groupTotal,
            pickupTime: new Date(Date.now() + 1000 * 60 * 60),
            note: data.note,
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
            },
          });

          if (stockUpdate.count !== 1) {
            throw new Error(`${menuItem?.name || "Menu"} stok tidak cukup.`);
          }
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

      if (appliedVoucherClaimId && appliedVoucherId && voucherRedemptionOrderId) {
        await redeemVoucherClaimForOrder(tx, {
          claimId: appliedVoucherClaimId,
          voucherId: appliedVoucherId,
          userId: customer.id,
          orderId: voucherRedemptionOrderId,
        });
      }

      return { orders: createdOrders };
    }, checkoutTransactionOptions);

    await invalidateCacheTags(["menu-items:public", "admin-dashboard"]);

    if (!checkoutAttemptId) {
      throw new Error("Referensi checkout gagal dibuat.");
    }

    const paymentAmount = checkoutResult.orders.reduce(
      (total, order) => total + order.total,
      0,
    );
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const returnUrl = new URL("/payment-status", request.url);
    returnUrl.searchParams.set("attempt", checkoutAttemptId);
    const tripayTransaction = await createTripayTransaction({
      method: data.paymentMethod,
      merchantReference: checkoutAttemptId,
      amount: paymentAmount,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      orderItems: [
        {
          sku: checkoutAttemptId,
          name: `Pesanan ResQFood (${checkoutItems.reduce(
            (total, item) => total + item.quantity,
            0,
          )} item)`,
          price: paymentAmount,
          quantity: 1,
        },
      ],
      callbackUrl: getTripayCallbackUrl(request.url),
      returnUrl: returnUrl.toString(),
      expiresAt,
    });

    await prisma.checkoutAttempt
      .update({
        where: { id: checkoutAttemptId },
        data: {
          paymentProvider: "TRIPAY",
          paymentMethodCode: tripayTransaction.paymentMethod,
          paymentMethodName: tripayTransaction.paymentName,
          paymentReference: tripayTransaction.reference,
          paymentStatus: tripayTransaction.status,
          paymentAmount:
            tripayTransaction.amount - tripayTransaction.feeCustomer,
          paymentFeeMerchant: tripayTransaction.feeMerchant,
          paymentFeeCustomer: tripayTransaction.feeCustomer,
          paymentCheckoutUrl: tripayTransaction.checkoutUrl,
          paymentPayCode: tripayTransaction.payCode,
          paymentQrUrl: tripayTransaction.qrUrl,
          paymentExpiresAt: tripayTransaction.expiredAt,
          errorMessage: null,
        },
      })
      .catch((error: unknown) => {
        console.error("Tripay payment metadata update failed", error);
      });

    return NextResponse.json(
      {
        ok: true,
        order: checkoutResult.orders[0],
        orders: checkoutResult.orders,
        payment: {
          attemptId: checkoutAttemptId,
          reference: tripayTransaction.reference,
          method: tripayTransaction.paymentMethod,
          methodName: tripayTransaction.paymentName,
          status: tripayTransaction.status,
          checkoutUrl: tripayTransaction.checkoutUrl,
          expiresAt: tripayTransaction.expiredAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout gagal.";

    if (checkoutAttemptId) {
      await releaseCheckoutReservation(checkoutAttemptId, message).catch(
        (releaseError: unknown) => {
          console.warn("Checkout reservation release failed", releaseError);
        },
      );
      await invalidateCacheTags(["menu-items:public", "admin-dashboard"]);
    }

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      {
        status:
          error instanceof TripayApiError && error.status >= 500
            ? error.status
            : 400,
      },
    );
  }
}
