import { MenuItemStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { notifyFavoriteMenusAvailable } from "@/lib/favorite-menu-notifications";
import { deriveMenuStatus } from "@/lib/menu-lifecycle";
import { prisma } from "@/lib/prisma";
import { notifyRestaurantFollowers } from "@/lib/restaurant-follower-notifications";
import { invalidateCacheTags } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicMenuCacheTags = ["menu-items:public"];

const bulkMenuSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum([
    "activate",
    "hide",
    "archive",
    "sold_out",
    "set_stock",
    "set_pickup",
    "set_category",
    "set_price",
    "schedule",
  ]),
  stock: z.coerce.number().int().min(0).optional(),
  pickupStart: z.string().trim().optional(),
  pickupEnd: z.string().trim().optional(),
  category: z.string().trim().min(2).optional(),
  originalPrice: z.coerce.number().int().positive().optional(),
  discountedPrice: z.coerce.number().int().positive().optional(),
  publishAt: z.string().trim().nullable().optional(),
});

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal menu tidak valid.");
  }

  return date;
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || (session.role !== UserRole.OWNER && session.role !== UserRole.ADMIN)) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = bulkMenuSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Input bulk menu tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const uniqueIds = Array.from(new Set(parsed.data.ids));
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: uniqueIds },
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      restaurant: true,
    },
  });

  if (menuItems.length !== uniqueIds.length) {
    return NextResponse.json(
      { ok: false, message: "Sebagian menu tidak ditemukan atau bukan milik toko ini." },
      { status: 404 },
    );
  }

  const publishAt = parseOptionalDate(parsed.data.publishAt);

  if (
    parsed.data.action === "set_pickup" &&
    parsed.data.pickupStart &&
    parsed.data.pickupEnd &&
    parsed.data.pickupEnd <= parsed.data.pickupStart
  ) {
    return NextResponse.json(
      { ok: false, message: "Jam selesai pickup harus lebih besar dari jam mulai." },
      { status: 400 },
    );
  }

  if (
    parsed.data.action === "set_price" &&
    parsed.data.originalPrice &&
    parsed.data.discountedPrice &&
    parsed.data.discountedPrice > parsed.data.originalPrice
  ) {
    return NextResponse.json(
      { ok: false, message: "Harga diskon tidak boleh lebih besar dari harga asli." },
      { status: 400 },
    );
  }

  const updatedMenuItems = await prisma.$transaction(
    menuItems.map((menuItem) => {
      const nextStock =
        parsed.data.action === "set_stock" && parsed.data.stock !== undefined
          ? parsed.data.stock
          : menuItem.stock;
      const requestedStatus =
        parsed.data.action === "activate"
          ? MenuItemStatus.ACTIVE
          : parsed.data.action === "hide"
            ? MenuItemStatus.HIDDEN
            : parsed.data.action === "archive"
              ? MenuItemStatus.ARCHIVED
              : parsed.data.action === "sold_out"
                ? MenuItemStatus.SOLD_OUT
                : undefined;
      const nextPublishAt =
        parsed.data.action === "schedule" ? publishAt : menuItem.publishAt;
      const nextStatus =
        parsed.data.action === "sold_out"
          ? MenuItemStatus.SOLD_OUT
          : deriveMenuStatus({
              requestedStatus,
              stock: nextStock,
              publishAt: nextPublishAt,
              currentStatus: menuItem.status,
            });

      return prisma.menuItem.update({
        where: { id: menuItem.id },
        data: {
          status: nextStatus,
          stock: parsed.data.action === "set_stock" ? parsed.data.stock : undefined,
          pickupStart:
            parsed.data.action === "set_pickup" ? parsed.data.pickupStart : undefined,
          pickupEnd:
            parsed.data.action === "set_pickup" ? parsed.data.pickupEnd : undefined,
          category:
            parsed.data.action === "set_category" ? parsed.data.category : undefined,
          originalPrice:
            parsed.data.action === "set_price"
              ? parsed.data.originalPrice
              : undefined,
          discountedPrice:
            parsed.data.action === "set_price"
              ? parsed.data.discountedPrice
              : undefined,
          publishAt: parsed.data.action === "schedule" ? publishAt : undefined,
          archivedAt:
            nextStatus === MenuItemStatus.ARCHIVED
              ? (menuItem.archivedAt ?? new Date())
              : parsed.data.action === "activate" || parsed.data.action === "hide"
                ? null
                : undefined,
        },
        include: {
          restaurant: true,
        },
      });
    }),
  );

  const previousMenuItemById = new Map(menuItems.map((item) => [item.id, item]));
  const becameAvailableItems = updatedMenuItems.filter((updatedMenuItem) => {
    const previousItem = previousMenuItemById.get(updatedMenuItem.id);

    return (
      updatedMenuItem.status === MenuItemStatus.ACTIVE &&
      (previousItem?.status !== MenuItemStatus.ACTIVE ||
        ((previousItem?.stock ?? 0) <= 0 && updatedMenuItem.stock > 0))
    );
  });

  const notificationResults = await Promise.allSettled([
    ...becameAvailableItems.map((menuItem) =>
      notifyRestaurantFollowers({
        restaurantId: menuItem.restaurantId,
        title: `${menuItem.restaurant.name} punya menu tersedia`,
        body: `${menuItem.name} sekarang bisa dipesan untuk pickup ${menuItem.pickupStart || menuItem.restaurant.pickupStart || "18:00"} - ${menuItem.pickupEnd || menuItem.restaurant.pickupEnd || "21:00"}.`,
        href: `/detail/${menuItem.id}`,
      }),
    ),
    notifyFavoriteMenusAvailable(becameAvailableItems),
  ]);

  for (const result of notificationResults) {
    if (result.status === "rejected") {
      console.warn("Bulk menu availability notification failed", result.reason);
    }
  }

  await invalidateCacheTags(publicMenuCacheTags);

  return NextResponse.json({
    ok: true,
    menuItems: updatedMenuItems,
    updatedCount: updatedMenuItems.length,
  });
}
