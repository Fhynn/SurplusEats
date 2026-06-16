import { MenuItemStatus } from "@prisma/client";

import { notifyFavoriteMenusAvailable } from "@/lib/favorite-menu-notifications";
import { prisma } from "@/lib/prisma";
import { notifyRestaurantFollowers } from "@/lib/restaurant-follower-notifications";

type LifecycleMenuItem = {
  id: string;
  name: string;
  restaurantId: string;
  pickupStart: string | null;
  pickupEnd: string | null;
  restaurant: {
    name: string;
    pickupStart: string | null;
    pickupEnd: string | null;
  };
};

function getPickupWindow(menuItem: LifecycleMenuItem) {
  return `${menuItem.pickupStart || menuItem.restaurant.pickupStart || "18:00"} - ${
    menuItem.pickupEnd || menuItem.restaurant.pickupEnd || "21:00"
  }`;
}

export async function reconcileMenuLifecycle() {
  const now = new Date();
  const dueScheduledItems = await prisma.menuItem.findMany({
    where: {
      status: MenuItemStatus.SCHEDULED,
      publishAt: { lte: now },
      stock: { gt: 0 },
      restaurant: { status: "APPROVED" },
    },
    select: {
      id: true,
      name: true,
      restaurantId: true,
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

  const [publishedResult, soldOutResult, expiredResult] = await Promise.all([
    prisma.menuItem.updateMany({
      where: {
        id: { in: dueScheduledItems.map((item) => item.id) },
      },
      data: {
        status: MenuItemStatus.ACTIVE,
      },
    }),
    prisma.menuItem.updateMany({
      where: {
        status: { in: [MenuItemStatus.ACTIVE, MenuItemStatus.SCHEDULED] },
        stock: { lte: 0 },
      },
      data: {
        status: MenuItemStatus.SOLD_OUT,
      },
    }),
    prisma.menuItem.updateMany({
      where: {
        status: MenuItemStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: MenuItemStatus.SOLD_OUT,
      },
    }),
  ]);

  const notificationResults = await Promise.allSettled(
    dueScheduledItems.map((menuItem) =>
      notifyRestaurantFollowers({
        restaurantId: menuItem.restaurantId,
        title: `Menu baru dari ${menuItem.restaurant.name}`,
        body: `${menuItem.name} sudah tersedia untuk pickup ${getPickupWindow(menuItem)}.`,
        href: `/detail/${menuItem.id}`,
      }),
    ),
  );

  const notifiedFollowers = notificationResults.reduce((total, result) => {
    if (result.status === "fulfilled") {
      return total + result.value;
    }

    console.warn("Scheduled menu notification failed", result.reason);
    return total;
  }, 0);
  const notifiedFavoriteUsers = await notifyFavoriteMenusAvailable(
    dueScheduledItems,
  ).catch((error: unknown) => {
    console.warn("Scheduled favorite menu notification failed", error);
    return 0;
  });

  return {
    publishedCount: publishedResult.count,
    soldOutCount: soldOutResult.count,
    expiredCount: expiredResult.count,
    notifiedFollowers,
    notifiedFavoriteUsers,
    checkedAt: now,
  };
}

export function deriveMenuStatus({
  requestedStatus,
  stock,
  publishAt,
  currentStatus,
}: {
  requestedStatus?: MenuItemStatus | null;
  stock: number;
  publishAt?: Date | null;
  currentStatus?: MenuItemStatus | null;
}) {
  if (requestedStatus === MenuItemStatus.ARCHIVED) {
    return MenuItemStatus.ARCHIVED;
  }

  if (requestedStatus === MenuItemStatus.HIDDEN) {
    return MenuItemStatus.HIDDEN;
  }

  if (publishAt && publishAt.getTime() > Date.now()) {
    return MenuItemStatus.SCHEDULED;
  }

  if (stock <= 0) {
    return MenuItemStatus.SOLD_OUT;
  }

  if (currentStatus === MenuItemStatus.ARCHIVED && requestedStatus !== MenuItemStatus.ACTIVE) {
    return MenuItemStatus.ARCHIVED;
  }

  return MenuItemStatus.ACTIVE;
}
