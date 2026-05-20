import { MenuItemStatus, RestaurantStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  CustomerStoreScreen,
  type CustomerStoreDetail,
} from "@/components/customer-store-screen";
import { MainShell } from "@/components/main-shell";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { prisma } from "@/lib/prisma";

interface StorePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params;
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
        take: 6,
        include: {
          user: {
            select: {
              name: true,
            },
          },
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
    reviews: restaurant.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      customerName: review.user.name,
      createdAt: review.createdAt.toISOString(),
    })),
    foods,
  };

  return (
    <MainShell>
      <CustomerStoreScreen store={store} />
    </MainShell>
  );
}
