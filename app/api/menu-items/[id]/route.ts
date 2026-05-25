import { MenuItemStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { notifyRestaurantFollowers } from "@/lib/restaurant-follower-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MenuItemRouteProps {
  params: Promise<{ id: string }>;
}

const updateMenuItemSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(8).optional(),
  category: z.string().min(2).optional(),
  originalPrice: z.coerce.number().int().positive().optional(),
  discountedPrice: z.coerce.number().int().positive().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  pickupStart: z.string().optional(),
  pickupEnd: z.string().optional(),
  status: z.nativeEnum(MenuItemStatus).optional(),
});

async function findEditableMenuItem(id: string) {
  const session = await getCurrentSession();

  if (
    !session ||
    (session.role !== UserRole.OWNER && session.role !== UserRole.ADMIN)
  ) {
    return { session, menuItem: null };
  }

  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      restaurant: true,
    },
  });

  return { session, menuItem };
}

export async function PATCH(request: Request, { params }: MenuItemRouteProps) {
  const { id } = await params;
  const { session, menuItem } = await findEditableMenuItem(id);

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login owner diperlukan." },
      { status: 401 },
    );
  }

  if (!menuItem) {
    return NextResponse.json(
      { ok: false, message: "Menu tidak ditemukan atau bukan milik restoran ini." },
      { status: 404 },
    );
  }

  const parsed = updateMenuItemSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Input menu tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const originalPrice = data.originalPrice ?? menuItem.originalPrice;
  const discountedPrice = data.discountedPrice ?? menuItem.discountedPrice;

  if (discountedPrice > originalPrice) {
    return NextResponse.json(
      { ok: false, message: "Harga diskon tidak boleh lebih besar dari harga asli." },
      { status: 400 },
    );
  }

  const nextStatus =
    data.status ??
    (typeof data.stock === "number"
      ? data.stock > 0
        ? MenuItemStatus.ACTIVE
        : MenuItemStatus.SOLD_OUT
      : undefined);

  const updatedMenuItem = await prisma.menuItem.update({
    where: { id: menuItem.id },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      originalPrice: data.originalPrice,
      discountedPrice: data.discountedPrice,
      stock: data.stock,
      imageUrl:
        data.imageUrl === "" ? null : data.imageUrl === undefined ? undefined : data.imageUrl,
      pickupStart: data.pickupStart,
      pickupEnd: data.pickupEnd,
      status: nextStatus,
    },
    include: {
      restaurant: true,
    },
  });

  const becameActive =
    menuItem.status !== MenuItemStatus.ACTIVE &&
    updatedMenuItem.status === MenuItemStatus.ACTIVE;
  const restockedActiveMenu =
    menuItem.status === MenuItemStatus.ACTIVE &&
    menuItem.stock <= 0 &&
    updatedMenuItem.stock > 0;

  if (becameActive || restockedActiveMenu) {
    await notifyRestaurantFollowers({
      restaurantId: updatedMenuItem.restaurantId,
      title: `${updatedMenuItem.restaurant.name} punya menu tersedia`,
      body: `${updatedMenuItem.name} sekarang bisa dipesan untuk pickup ${updatedMenuItem.pickupStart || updatedMenuItem.restaurant.pickupStart || "18:00"} - ${updatedMenuItem.pickupEnd || updatedMenuItem.restaurant.pickupEnd || "21:00"}.`,
      href: `/detail/${updatedMenuItem.id}`,
    });
  }

  return NextResponse.json({ ok: true, menuItem: updatedMenuItem });
}

export async function DELETE(_request: Request, { params }: MenuItemRouteProps) {
  const { id } = await params;
  const { session, menuItem } = await findEditableMenuItem(id);

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login owner diperlukan." },
      { status: 401 },
    );
  }

  if (!menuItem) {
    return NextResponse.json(
      { ok: false, message: "Menu tidak ditemukan atau bukan milik restoran ini." },
      { status: 404 },
    );
  }

  await prisma.menuItem.delete({
    where: { id: menuItem.id },
  });

  return NextResponse.json({ ok: true });
}
