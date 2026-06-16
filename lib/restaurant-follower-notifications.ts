import { NotificationType } from "@prisma/client";

import {
  createManyNotificationsAndDeliver,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";

type NotifyRestaurantFollowersInput = {
  restaurantId: string;
  title: string;
  body: string;
  href: string;
};

const restaurantFollowerDedupeWindowMs = 6 * 60 * 60 * 1000;

export async function notifyRestaurantFollowers({
  restaurantId,
  title,
  body,
  href,
}: NotifyRestaurantFollowersInput) {
  const followers = await prisma.favoriteRestaurant.findMany({
    where: { restaurantId },
    select: { userId: true },
  });

  if (followers.length === 0) {
    return 0;
  }

  const candidateNotifications: NotificationDeliveryPayload[] = followers.map(
    (follower) => ({
      userId: follower.userId,
      type: NotificationType.PROMO,
      title,
      body,
      href,
    }),
  );
  const since = new Date(Date.now() - restaurantFollowerDedupeWindowMs);
  const recentNotifications = await prisma.notification.findMany({
    where: {
      userId: {
        in: candidateNotifications.map((notification) => notification.userId),
      },
      type: NotificationType.PROMO,
      href,
      title,
      createdAt: { gte: since },
    },
    select: {
      userId: true,
      href: true,
      title: true,
    },
  });
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
