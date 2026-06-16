import {
  CheckoutAttemptStatus,
  MenuItemStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { createPickupCode } from "@/lib/backend-utils";
import { notifyFavoriteMenuItemsAvailableByIds } from "@/lib/favorite-menu-notifications";
import { createManyNotificationsAndDeliver } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  getTripayPaidAt,
  tripayAmountMatchesOrderTotal,
  tripayCallbackSchema,
  verifyTripayCallbackSignature,
} from "@/lib/tripay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxCallbackBodyBytes = 64 * 1024;
const callbackEvent = "payment_status";
const callbackTransactionOptions = {
  maxWait: 5_000,
  timeout: 15_000,
};

function callbackResponse(
  body: { success: boolean; message?: string },
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      provider: "tripay",
      callback: "ready",
      method: "POST",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const declaredBodyLength = Number(request.headers.get("content-length") || 0);

  if (
    Number.isFinite(declaredBodyLength) &&
    declaredBodyLength > maxCallbackBodyBytes
  ) {
    return callbackResponse(
      { success: false, message: "Callback body terlalu besar." },
      413,
    );
  }

  const privateKey = process.env.TRIPAY_PRIVATE_KEY?.trim();

  if (!privateKey) {
    console.error("Tripay callback rejected: TRIPAY_PRIVATE_KEY is not configured");

    return callbackResponse(
      { success: false, message: "Konfigurasi callback belum tersedia." },
      503,
    );
  }

  const rawBody = await request.text();

  if (Buffer.byteLength(rawBody, "utf8") > maxCallbackBodyBytes) {
    return callbackResponse(
      { success: false, message: "Callback body terlalu besar." },
      413,
    );
  }

  const signature = request.headers.get("x-callback-signature")?.trim() || "";

  if (
    !verifyTripayCallbackSignature({
      rawBody,
      privateKey,
      signature,
    })
  ) {
    return callbackResponse(
      { success: false, message: "Invalid signature." },
      401,
    );
  }

  const event = request.headers.get("x-callback-event")?.trim();

  if (event !== callbackEvent) {
    return callbackResponse(
      {
        success: false,
        message: `Unrecognized callback event: ${event || "empty"}.`,
      },
      400,
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return callbackResponse(
      { success: false, message: "Invalid JSON payload." },
      400,
    );
  }

  const parsedPayload = tripayCallbackSchema.safeParse(parsedJson);

  if (!parsedPayload.success) {
    return callbackResponse(
      { success: false, message: "Invalid callback payload." },
      400,
    );
  }

  const payload = parsedPayload.data;
  const merchantReference = payload.merchant_ref?.trim();

  if (!merchantReference) {
    return callbackResponse(
      { success: false, message: "Merchant reference tidak tersedia." },
      400,
    );
  }

  if (payload.is_closed_payment !== 1) {
    return callbackResponse(
      { success: false, message: "Open payment tidak didukung." },
      400,
    );
  }

  const checkoutAttempt = await prisma.checkoutAttempt.findUnique({
    where: { id: merchantReference },
    select: {
      paymentReference: true,
      paymentMethodCode: true,
    },
  });

  if (
    checkoutAttempt?.paymentReference &&
    checkoutAttempt.paymentReference !== payload.reference
  ) {
    return callbackResponse(
      { success: false, message: "Referensi transaksi tidak sesuai." },
      409,
    );
  }

  if (
    checkoutAttempt?.paymentMethodCode &&
    checkoutAttempt.paymentMethodCode !== payload.payment_method_code
  ) {
    return callbackResponse(
      { success: false, message: "Metode pembayaran tidak sesuai." },
      409,
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderCode: merchantReference },
        { checkoutAttemptId: merchantReference },
      ],
    },
    select: {
      id: true,
      orderCode: true,
      checkoutAttemptId: true,
      paymentStatus: true,
      status: true,
      total: true,
    },
  });

  if (orders.length === 0) {
    return callbackResponse(
      {
        success: false,
        message: `Order tidak ditemukan: ${merchantReference}.`,
      },
      404,
    );
  }

  const expectedTotal = orders.reduce((total, order) => total + order.total, 0);

  if (!tripayAmountMatchesOrderTotal(payload, expectedTotal)) {
    console.warn("Tripay callback amount mismatch", {
      expectedTotal,
      merchantReference,
      reference: payload.reference,
      totalAmount: payload.total_amount,
    });

    return callbackResponse(
      { success: false, message: "Nominal transaksi tidak sesuai." },
      422,
    );
  }

  const orderIds = orders.map((order) => order.id);
  const checkoutAttemptIds = Array.from(
    new Set(
      orders
        .map((order) => order.checkoutAttemptId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const transactionResult = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const notifications: Array<{
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        href: string;
      }> = [];
      const restoredAvailableMenuItemIds = new Set<string>();

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`resqfood:tripay:${payload.reference}`}))`;

      if (payload.status === "PAID") {
      const payableOrders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              menuItemId: true,
              quantity: true,
            },
          },
          restaurant: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
      });

      for (const order of payableOrders) {
        const paidOrderUpdate = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING,
          },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
            paidAt: getTripayPaidAt(payload.paid_at),
            pickupCode: createPickupCode(),
          },
        });

        if (paidOrderUpdate.count !== 1) {
          continue;
        }

        for (const item of order.items) {
          if (!item.menuItemId) {
            continue;
          }

          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              soldCount: { increment: item.quantity },
            },
          });
        }

        const existingWalletTransaction = await tx.walletTransaction.findFirst({
          where: {
            type: WalletTransactionType.ORDER_INCOME,
            reference: order.orderCode,
          },
          select: { id: true },
        });

        if (!existingWalletTransaction) {
          const customerPlatformFee = order.serviceFee + order.taxFee;
          const merchantGrossAmount = Math.max(
            0,
            order.total - customerPlatformFee,
          );
          const merchantCommission = Math.min(
            merchantGrossAmount,
            order.platformFee,
          );
          const merchantIncome = Math.max(
            0,
            merchantGrossAmount - merchantCommission,
          );

          await tx.walletTransaction.create({
            data: {
              restaurantId: order.restaurantId,
              type: WalletTransactionType.ORDER_INCOME,
              status: WalletTransactionStatus.PENDING,
              amount: merchantIncome,
              grossAmount: merchantGrossAmount,
              platformFee: merchantCommission,
              netAmount: merchantIncome,
              reference: order.orderCode,
              description: `Order ${order.orderCode} dari ${order.customer.name} telah dibayar melalui Tripay.`,
            },
          });
        }

        notifications.push(
          {
            userId: order.customer.id,
            type: NotificationType.ORDER,
            title: "Pembayaran berhasil",
            body: `${order.orderCode} sudah dibayar dan diteruskan ke ${order.restaurant.name}.`,
            href: `/orders/${order.orderCode}`,
          },
          {
            userId: order.restaurant.ownerId,
            type: NotificationType.ORDER,
            title: "Order baru sudah dibayar",
            body: `${order.customer.name} membayar order ${order.orderCode}.`,
            href: `/owner/orders/${order.orderCode}`,
          },
        );
      }

      if (checkoutAttemptIds.length > 0) {
        await tx.checkoutAttempt.updateMany({
          where: { id: { in: checkoutAttemptIds } },
          data: {
            status: CheckoutAttemptStatus.COMPLETED,
            paymentReference: payload.reference,
            paymentMethodCode: payload.payment_method_code,
            paymentMethodName: payload.payment_method,
            paymentStatus: payload.status,
            paymentAmount: payload.total_amount - payload.fee_customer,
            paymentFeeMerchant: payload.fee_merchant,
            paymentFeeCustomer: payload.fee_customer,
            paymentPaidAt: getTripayPaidAt(payload.paid_at),
            errorMessage: null,
          },
        });
      }

      if (payableOrders.length > 0) {
        const menuItemIds = Array.from(
          new Set(
            payableOrders.flatMap((order) =>
              order.items
                .map((item) => item.menuItemId)
                .filter((id): id is string => Boolean(id)),
            ),
          ),
        );
        const customerIds = Array.from(
          new Set(payableOrders.map((order) => order.customer.id)),
        );

        if (menuItemIds.length > 0 && customerIds.length > 0) {
          await tx.cartItem.deleteMany({
            where: {
              userId: { in: customerIds },
              menuItemId: { in: menuItemIds },
            },
          });
        }
      }
      } else if (
        payload.status === "FAILED" ||
        payload.status === "EXPIRED"
      ) {
      const pendingOrders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
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
      const failedOrderIds: string[] = [];

      for (const order of pendingOrders) {
        const failedOrderUpdate = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: PaymentStatus.PENDING,
            status: OrderStatus.PENDING,
          },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: OrderStatus.PAYMENT_FAILED,
          },
        });

        if (failedOrderUpdate.count !== 1) {
          continue;
        }

        failedOrderIds.push(order.id);

        for (const item of order.items) {
          if (!item.menuItemId) {
            continue;
          }

          const menuItem = await tx.menuItem.findUnique({
            where: { id: item.menuItemId },
            select: { status: true },
          });

          if (menuItem?.status === MenuItemStatus.SOLD_OUT) {
            restoredAvailableMenuItemIds.add(item.menuItemId);
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

      if (failedOrderIds.length > 0) {
        await tx.voucherRedemption.updateMany({
          where: { orderId: { in: failedOrderIds } },
          data: { orderId: null },
        });
      }

      if (checkoutAttemptIds.length > 0 && failedOrderIds.length > 0) {
        await tx.checkoutAttempt.updateMany({
          where: { id: { in: checkoutAttemptIds } },
          data: {
            status: CheckoutAttemptStatus.FAILED,
            paymentReference: payload.reference,
            paymentMethodCode: payload.payment_method_code,
            paymentMethodName: payload.payment_method,
            paymentStatus: payload.status,
            paymentAmount: payload.total_amount - payload.fee_customer,
            paymentFeeMerchant: payload.fee_merchant,
            paymentFeeCustomer: payload.fee_customer,
            errorMessage: `Pembayaran Tripay ${payload.status.toLowerCase()}.`,
          },
        });
      }
      } else if (payload.status === "REFUND") {
      await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          paymentStatus: PaymentStatus.PAID,
        },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          status: OrderStatus.REFUNDED,
        },
      });

      if (checkoutAttemptIds.length > 0) {
        await tx.checkoutAttempt.updateMany({
          where: { id: { in: checkoutAttemptIds } },
          data: {
            paymentStatus: payload.status,
          },
        });
      }
      }

      return {
        notifications,
        restoredAvailableMenuItemIds: Array.from(restoredAvailableMenuItemIds),
      };
    },
    callbackTransactionOptions,
  );

  if (transactionResult.notifications.length > 0) {
    await createManyNotificationsAndDeliver(
      transactionResult.notifications,
    ).catch((error: unknown) => {
      console.warn("Tripay payment notification delivery failed", error);
    });
  }

  if (transactionResult.restoredAvailableMenuItemIds.length > 0) {
    await notifyFavoriteMenuItemsAvailableByIds(
      transactionResult.restoredAvailableMenuItemIds,
    ).catch((error: unknown) => {
      console.warn("Tripay favorite restock notification failed", error);
    });
  }

  console.info("Tripay callback processed", {
    merchantReference,
    orderCodes: orders.map((order) => order.orderCode),
    reference: payload.reference,
    status: payload.status,
  });

  return callbackResponse({ success: true });
}
