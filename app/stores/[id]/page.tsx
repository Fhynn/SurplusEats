import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  CustomerStoreScreen,
  type CustomerStoreDetail,
} from "@/components/customer-store-screen";
import { MainShell } from "@/components/main-shell";
import { getCurrentSession } from "@/lib/auth-session";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { prisma } from "@/lib/prisma";

interface StorePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params;
  const session = await getCurrentSession();
  const customerUserId = session?.role === UserRole.CUSTOMER ? session.userId : "";
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      status: RestaurantStatus.APPROVED,
      OR: [{ id }, { slug: id }],
    },
    include: {
      menuItems: {
        where: { status: MenuItemStatus.ACTIVE },
        orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          helpfulVotes: {
            where: {
              userId: customerUserId,
            },
            select: {
              id: true,
            },
          },
          images: {
            include: {
              asset: true,
            },
          },
          reports: {
            where: {
              userId: customerUserId,
            },
            select: {
              id: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              helpfulVotes: true,
              reports: true,
            },
          },
        },
      },
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  if (!restaurant) {
    notFound();
  }

  const foods = restaurant.menuItems.map((menuItem) =>
    menuItemToFood({ ...menuItem, restaurant } satisfies ApiMenuItem),
  );
  const favoriteRestaurant =
    session?.role === UserRole.CUSTOMER
      ? await prisma.favoriteRestaurant.findUnique({
          where: {
            userId_restaurantId: {
              userId: session.userId,
              restaurantId: restaurant.id,
            },
          },
          select: { id: true },
        })
      : null;
  const store: CustomerStoreDetail = {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    city: restaurant.city,
    phone: restaurant.phone,
    imageUrl: restaurant.imageUrl,
    bannerUrl: restaurant.bannerUrl,
    rating: restaurant.rating,
    reviewCount: restaurant.reviewCount,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    pickupStart: restaurant.pickupStart,
    pickupEnd: restaurant.pickupEnd,
    favoriteCount: restaurant._count.favoritedBy,
    isFavorite: Boolean(favoriteRestaurant),
    reviews: restaurant.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      ownerReply: review.ownerReply,
      ownerRepliedAt: review.ownerRepliedAt?.toISOString() ?? null,
      customerName: review.user.name,
      createdAt: review.createdAt.toISOString(),
      helpfulCount: review._count.helpfulVotes,
      isHelpful: review.helpfulVotes.length > 0,
      isReported: review.reports.length > 0,
      reportCount: review._count.reports,
      images: review.images.map((image) => ({
        id: image.id,
        url: image.asset.url,
      })),
    })),
    foods,
  };

  return (
    <MainShell>
      <CustomerStoreScreen store={store} />
    </MainShell>
  );
}
