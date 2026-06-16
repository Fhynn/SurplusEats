import {
  NotificationType,
  OrderStatus,
  WalletTransactionStatus,
} from "@prisma/client";

import {
  deliverNotifications,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import { transitionOrderIncomeWalletTransaction } from "@/lib/wallet-integrity";

const defaultNoShowGraceMinutes = 15;

export type ExpireNoShowOrdersResult = {
  expiredCount: number;
  graceMinutes: number;
  cutoff: Date;
  expiredOrders: Array<{
    orderCode: string;
    customerName: string;
    restaurantName: string;
  }>;
};

function getNoShowGraceMinutes() {
  const configuredValue = Number(process.env.ORDER_NO_SHOW_GRACE_MINUTES);

  if (!Number.isFinite(configuredValue) || configuredValue < 0) {
    return defaultNoShowGraceMinutes;
  }

  return configuredValue;
}

export async function expireNoShowOrders(now = new Date()) {
  const graceMinutes = getNoShowGraceMinutes();
  const cutoff = new Date(now.getTime() - graceMinutes * 60 * 1000);
  const readyExpiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.READY,
      pickupTime: {
        not: null,
        lte: cutoff,
      },
    },
    orderBy: { pickupTime: "asc" },
    take: 100,
    include: {
      customer: true,
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (readyExpiredOrders.length === 0) {
    return {
      expiredCount: 0,
      graceMinutes,
      cutoff,
      expiredOrders: [],
    } satisfies ExpireNoShowOrdersResult;
  }

  const expiredOrders: ExpireNoShowOrdersResult["expiredOrders"] = [];
  const notificationPayloads: NotificationDeliveryPayload[] = [];

  await prisma.$transaction(async (tx) => {
    for (const order of readyExpiredOrders) {
      const updatedOrder = await tx.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.READY,
          pickupTime: {
            not: null,
            lte: cutoff,
          },
        },
        data: {
          status: OrderStatus.NO_SHOW,
          noShowAt: now,
        },
      });

      if (updatedOrder.count !== 1) {
        continue;
      }

      await transitionOrderIncomeWalletTransaction(tx, {
        restaurantId: order.restaurantId,
        orderCode: order.orderCode,
        nextStatus: WalletTransactionStatus.COMPLETED,
        processedAt: now,
        description: `Order ${order.orderCode} no-show pickup`,
      });

      const orderNotifications = [
        {
          userId: order.customerId,
          type: NotificationType.ORDER,
          title: "Pesanan tidak diambil",
          body: `${order.orderCode} melewati batas pickup dan ditandai no-show.`,
          href: `/orders/${order.orderCode}`,
        },
        {
          userId: order.restaurant.ownerId,
          type: NotificationType.ORDER,
          title: "Order no-show",
          body: `${order.customer.name} tidak mengambil ${order.orderCode} sampai batas pickup.`,
          href: `/owner/orders/${order.orderCode}`,
        },
      ];

      await tx.notification.createMany({
        data: orderNotifications,
      });
      notificationPayloads.push(...orderNotifications);

      expiredOrders.push({
        orderCode: order.orderCode,
        customerName: order.customer.name,
        restaurantName: order.restaurant.name,
      });
    }
  });

  await deliverNotifications(notificationPayloads);

  return {
    expiredCount: expiredOrders.length,
    graceMinutes,
    cutoff,
    expiredOrders,
  } satisfies ExpireNoShowOrdersResult;
}
