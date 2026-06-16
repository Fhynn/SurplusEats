import {
  MenuItemStatus,
  NotificationType,
  RestaurantStatus,
} from "@prisma/client";

import {
  createManyNotificationsAndDeliver,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";

type FavoriteMenuNotificationItem = {
  id: string;
  name: string;
  pickupStart: string | null;
  pickupEnd: string | null;
  restaurant: {
    name: string;
    pickupStart: string | null;
    pickupEnd: string | null;
  };
};

const favoriteNotificationDedupeWindowMs = 6 * 60 * 60 * 1000;

function getPickupWindow(menuItem: FavoriteMenuNotificationItem) {
  return `${menuItem.pickupStart || menuItem.restaurant.pickupStart || "18:00"} - ${
    menuItem.pickupEnd || menuItem.restaurant.pickupEnd || "21:00"
  }`;
}

function buildFavoriteMenuNotification(
  menuItem: FavoriteMenuNotificationItem,
  userId: string,
): NotificationDeliveryPayload {
  return {
    userId,
    type: NotificationType.PROMO,
    title: `${menuItem.name} tersedia lagi`,
    body: `${menuItem.restaurant.name} sudah menyediakan ${menuItem.name}. Bisa dipesan untuk pickup ${getPickupWindow(menuItem)}.`,
    href: `/detail/${menuItem.id}`,
  };
}

export async function notifyFavoriteMenuAvailability(
  menuItem: FavoriteMenuNotificationItem,
) {
  return notifyFavoriteMenusAvailable([menuItem]);
}

export async function notifyFavoriteMenuItemsAvailableByIds(
  menuItemIds: string[],
) {
  const uniqueMenuItemIds = Array.from(new Set(menuItemIds.filter(Boolean)));

  if (uniqueMenuItemIds.length === 0) {
    return 0;
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: uniqueMenuItemIds },
      status: MenuItemStatus.ACTIVE,
      stock: { gt: 0 },
      restaurant: {
        status: RestaurantStatus.APPROVED,
      },
    },
    select: {
      id: true,
      name: true,
      pickupStart: true,
      pickupEnd: true,
      restaurant: {
        select: {
          name: true,
          pickupStart: true,
          pickupEnd: true,
        },
      },
    },
  });

  return notifyFavoriteMenusAvailable(menuItems);
}

export async function notifyFavoriteMenusAvailable(
  menuItems: FavoriteMenuNotificationItem[],
) {
  const menuItemById = new Map(
    menuItems.map((menuItem) => [menuItem.id, menuItem]),
  );
  const menuItemIds = Array.from(menuItemById.keys());

  if (menuItemIds.length === 0) {
    return 0;
  }

  const favorites = await prisma.favoriteMenuItem.findMany({
    where: {
      menuItemId: { in: menuItemIds },
    },
    select: {
      userId: true,
      menuItemId: true,
    },
  });

  if (favorites.length === 0) {
    return 0;
  }

  const candidateNotifications = favorites
    .map((favorite) => {
      const menuItem = menuItemById.get(favorite.menuItemId);

      return menuItem
        ? buildFavoriteMenuNotification(menuItem, favorite.userId)
        : null;
    })
    .filter((notification): notification is NotificationDeliveryPayload =>
      Boolean(notification),
    );

  if (candidateNotifications.length === 0) {
    return 0;
  }

  const since = new Date(Date.now() - favoriteNotificationDedupeWindowMs);
  const userIds = Array.from(
    new Set(candidateNotifications.map((notification) => notification.userId)),
  );
  const hrefs = Array.from(
    new Set(
      candidateNotifications
        .map((notification) => notification.href)
        .filter((href): href is string => Boolean(href)),
    ),
  );

  const recentNotifications =
    userIds.length > 0 && hrefs.length > 0
      ? await prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            type: NotificationType.PROMO,
            href: { in: hrefs },
            createdAt: { gte: since },
          },
          select: {
            userId: true,
            href: true,
            title: true,
          },
        })
      : [];

  const recentKeys = new Set(
    recentNotifications.map(
      (notification) =>
        `${notification.userId}:${notification.href ?? ""}:${notification.title}`,
    ),
  );
  const queuedKeys = new Set<string>();
  const notifications = candidateNotifications.filter((notification) => {
    const key = `${notification.userId}:${notification.href ?? ""}:${notification.title}`;

    if (recentKeys.has(key) || queuedKeys.has(key)) {
      return false;
    }

    queuedKeys.add(key);
    return true;
  });

  await createManyNotificationsAndDeliver(notifications);

  return notifications.length;
}
