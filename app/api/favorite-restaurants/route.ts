import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const favoriteRestaurantSchema = z.object({
  restaurantId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId");

  if (restaurantId) {
    const favorite = await prisma.favoriteRestaurant.findUnique({
      where: {
        userId_restaurantId: {
          userId: session.userId,
          restaurantId,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      isFavorite: Boolean(favorite),
    });
  }

  const favorites = await prisma.favoriteRestaurant.findMany({
    where: {
      userId: session.userId,
      restaurant: { status: RestaurantStatus.APPROVED },
    },
    include: {
      restaurant: {
        include: {
          _count: {
            select: {
              favoritedBy: true,
              menuItems: {
                where: {
                  status: MenuItemStatus.ACTIVE,
                  stock: { gt: 0 },
                },
              },
            },
          },
          menuItems: {
            where: {
              status: MenuItemStatus.ACTIVE,
              stock: { gt: 0 },
            },
            orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
            take: 3,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, favorites });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = favoriteRestaurantSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Toko favorit tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: parsed.data.restaurantId,
      status: RestaurantStatus.APPROVED,
    },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json(
      { ok: false, message: "Toko tidak tersedia untuk diikuti." },
      { status: 404 },
    );
  }

  const favorite = await prisma.favoriteRestaurant.upsert({
    where: {
      userId_restaurantId: {
        userId: session.userId,
        restaurantId: restaurant.id,
      },
    },
    update: {},
    create: {
      userId: session.userId,
      restaurantId: restaurant.id,
    },
  });

  return NextResponse.json({ ok: true, favorite }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json(
      { ok: false, message: "Toko favorit tidak valid." },
      { status: 400 },
    );
  }

  await prisma.favoriteRestaurant.deleteMany({
    where: {
      userId: session.userId,
      restaurantId,
    },
  });

  return NextResponse.json({ ok: true });
}
