import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const favoriteSchema = z.object({
  menuItemId: z.string().min(1),
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
  const menuItemId = url.searchParams.get("menuItemId");

  if (menuItemId) {
    const favorite = await prisma.favoriteMenuItem.findUnique({
      where: {
        userId_menuItemId: {
          userId: session.userId,
          menuItemId,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      isFavorite: Boolean(favorite),
    });
  }

  const favorites = await prisma.favoriteMenuItem.findMany({
    where: {
      userId: session.userId,
      menuItem: {
        status: MenuItemStatus.ACTIVE,
        restaurant: {
          status: RestaurantStatus.APPROVED,
          latitude: { not: null },
          longitude: { not: null },
        },
      },
    },
    include: {
      menuItem: {
        include: {
          restaurant: true,
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

  const parsed = favoriteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Menu favorit tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id: parsed.data.menuItemId,
      status: MenuItemStatus.ACTIVE,
      restaurant: {
        status: RestaurantStatus.APPROVED,
        latitude: { not: null },
        longitude: { not: null },
      },
    },
    select: { id: true },
  });

  if (!menuItem) {
    return NextResponse.json(
      { ok: false, message: "Menu tidak tersedia untuk difavoritkan." },
      { status: 404 },
    );
  }

  const favorite = await prisma.favoriteMenuItem.upsert({
    where: {
      userId_menuItemId: {
        userId: session.userId,
        menuItemId: menuItem.id,
      },
    },
    update: {},
    create: {
      userId: session.userId,
      menuItemId: menuItem.id,
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
  const menuItemId = url.searchParams.get("menuItemId");

  if (!menuItemId) {
    return NextResponse.json(
      { ok: false, message: "Menu favorit tidak valid." },
      { status: 400 },
    );
  }

  await prisma.favoriteMenuItem.deleteMany({
    where: {
      userId: session.userId,
      menuItemId,
    },
  });

  return NextResponse.json({ ok: true });
}
