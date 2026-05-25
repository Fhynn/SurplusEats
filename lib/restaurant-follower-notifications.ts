import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotifyRestaurantFollowersInput = {
  restaurantId: string;
  title: string;
  body: string;
  href: string;
};

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

  const result = await prisma.notification.createMany({
    data: followers.map((follower) => ({
      userId: follower.userId,
      type: NotificationType.PROMO,
      title,
      body,
      href,
    })),
  });

  return result.count;
}
