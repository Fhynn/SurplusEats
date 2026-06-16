import { MenuItemStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { notifyFavoriteMenuAvailability } from "@/lib/favorite-menu-notifications";
import { deriveMenuStatus } from "@/lib/menu-lifecycle";
import { prisma } from "@/lib/prisma";
import { notifyRestaurantFollowers } from "@/lib/restaurant-follower-notifications";
import { invalidateCacheTags } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicMenuCacheTags = ["menu-items:public"];

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
  publishAt: z.string().trim().nullable().optional(),
  expiresAt: z.string().trim().nullable().optional(),
  status: z.nativeEnum(MenuItemStatus).optional(),
});

function parseOptionalDate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal menu tidak valid.");
  }

  return date;
}

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
  const publishAt = parseOptionalDate(data.publishAt);
  const expiresAt = parseOptionalDate(data.expiresAt);
  const nextPublishAt = publishAt === undefined ? menuItem.publishAt : publishAt;
  const nextExpiresAt = expiresAt === undefined ? menuItem.expiresAt : expiresAt;

  if (discountedPrice > originalPrice) {
    return NextResponse.json(
      { ok: false, message: "Harga diskon tidak boleh lebih besar dari harga asli." },
      { status: 400 },
    );
  }

  if (nextPublishAt && nextExpiresAt && nextPublishAt >= nextExpiresAt) {
    return NextResponse.json(
      { ok: false, message: "Jadwal publish harus sebelum waktu expired." },
      { status: 400 },
    );
  }

  if (data.status === MenuItemStatus.SCHEDULED && !nextPublishAt) {
    return NextResponse.json(
      { ok: false, message: "Jadwal publish wajib diisi untuk menu terjadwal." },
      { status: 400 },
    );
  }

  const nextStock = data.stock ?? menuItem.stock;
  const nextStatus = deriveMenuStatus({
    requestedStatus: data.status,
    stock: nextStock,
    publishAt: nextPublishAt,
    currentStatus: menuItem.status,
  });

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
      publishAt,
      expiresAt,
      archivedAt:
        nextStatus === MenuItemStatus.ARCHIVED
          ? (menuItem.archivedAt ?? new Date())
          : data.status === MenuItemStatus.ACTIVE || data.status === MenuItemStatus.HIDDEN
            ? null
            : undefined,
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
    const notificationResults = await Promise.allSettled([
      notifyRestaurantFollowers({
        restaurantId: updatedMenuItem.restaurantId,
        title: `${updatedMenuItem.restaurant.name} punya menu tersedia`,
        body: `${updatedMenuItem.name} sekarang bisa dipesan untuk pickup ${updatedMenuItem.pickupStart || updatedMenuItem.restaurant.pickupStart || "18:00"} - ${updatedMenuItem.pickupEnd || updatedMenuItem.restaurant.pickupEnd || "21:00"}.`,
        href: `/detail/${updatedMenuItem.id}`,
      }),
      notifyFavoriteMenuAvailability(updatedMenuItem),
    ]);

    for (const result of notificationResults) {
      if (result.status === "rejected") {
        console.warn("Menu availability notification failed", result.reason);
      }
    }
  }

  await invalidateCacheTags(publicMenuCacheTags);

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

  await invalidateCacheTags(publicMenuCacheTags);

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: MenuItemRouteProps) {
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

  const action = new URL(request.url).searchParams.get("action");

  if (action !== "duplicate") {
    return NextResponse.json(
      { ok: false, message: "Aksi menu tidak valid." },
      { status: 400 },
    );
  }

  const duplicateName = `${menuItem.name} Copy`;
  const baseSlug = slugify(duplicateName) || "menu-copy";
  const duplicate = await prisma.menuItem.create({
    data: {
      restaurantId: menuItem.restaurantId,
      name: duplicateName,
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      description: menuItem.description,
      category: menuItem.category,
      imageUrl: menuItem.imageUrl,
      originalPrice: menuItem.originalPrice,
      discountedPrice: menuItem.discountedPrice,
      stock: 0,
      pickupStart: menuItem.pickupStart,
      pickupEnd: menuItem.pickupEnd,
      expiresAt: menuItem.expiresAt,
      status: MenuItemStatus.HIDDEN,
    },
    include: {
      restaurant: true,
    },
  });

  await invalidateCacheTags(publicMenuCacheTags);

  return NextResponse.json({ ok: true, menuItem: duplicate }, { status: 201 });
}
