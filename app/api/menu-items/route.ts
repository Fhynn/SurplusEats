import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { deriveMenuStatus, reconcileMenuLifecycle } from "@/lib/menu-lifecycle";
import { prisma } from "@/lib/prisma";
import { notifyRestaurantFollowers } from "@/lib/restaurant-follower-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMenuItemSchema = z
  .object({
    ownerEmail: z.string().email().optional(),
    restaurantId: z.string().optional(),
    name: z.string().min(3),
    description: z.string().min(8),
    category: z.string().min(2),
    originalPrice: z.coerce.number().int().positive(),
    discountedPrice: z.coerce.number().int().positive(),
    stock: z.coerce.number().int().min(0),
    imageUrl: z.string().url().optional().or(z.literal("")),
    pickupStart: z.string().optional(),
    pickupEnd: z.string().optional(),
    publishAt: z.string().trim().nullable().optional(),
    expiresAt: z.string().trim().nullable().optional(),
    status: z.nativeEnum(MenuItemStatus).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountedPrice > data.originalPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountedPrice"],
        message: "Harga diskon tidak boleh lebih besar dari harga asli.",
      });
    }
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

export async function GET(request: Request) {
  await reconcileMenuLifecycle();

  const url = new URL(request.url);
  const session = await getCurrentSession();
  const query = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const restaurantId = url.searchParams.get("restaurantId")?.trim();
  const scope = url.searchParams.get("scope");
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const isOwnerScope = scope === "owner";

  if (
    isOwnerScope &&
    session?.role !== UserRole.OWNER &&
    session?.role !== UserRole.ADMIN
  ) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      restaurantId:
        restaurantId && (!isOwnerScope || session?.role === UserRole.ADMIN)
          ? restaurantId
          : undefined,
      status: isOwnerScope
        ? includeArchived
          ? undefined
          : { not: MenuItemStatus.ARCHIVED }
        : MenuItemStatus.ACTIVE,
      restaurant: isOwnerScope
        ? session?.role === UserRole.OWNER
          ? { ownerId: session.userId }
          : undefined
        : { status: RestaurantStatus.APPROVED },
      category:
        category && category !== "Semua"
          ? { equals: category, mode: "insensitive" }
          : undefined,
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { restaurant: { name: { contains: query, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: {
      restaurant: true,
    },
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, menuItems });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (
    !session ||
    (session.role !== UserRole.OWNER && session.role !== UserRole.ADMIN)
  ) {
    return NextResponse.json(
      { ok: false, message: "Login owner diperlukan untuk menambah menu." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = createMenuItemSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Input menu tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const publishAt = parseOptionalDate(data.publishAt);
  const expiresAt = parseOptionalDate(data.expiresAt);

  if (publishAt && expiresAt && publishAt >= expiresAt) {
    return NextResponse.json(
      { ok: false, message: "Jadwal publish harus sebelum waktu expired." },
      { status: 400 },
    );
  }

  if (data.status === MenuItemStatus.SCHEDULED && !publishAt) {
    return NextResponse.json(
      { ok: false, message: "Jadwal publish wajib diisi untuk menu terjadwal." },
      { status: 400 },
    );
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: data.restaurantId || undefined,
      ownerId: session.role === UserRole.OWNER ? session.userId : undefined,
      owner:
        session.role === UserRole.ADMIN && data.ownerEmail
          ? { email: data.ownerEmail, role: UserRole.OWNER }
          : undefined,
    },
  });

  if (!restaurant) {
    return NextResponse.json(
      { ok: false, message: "Restoran owner belum tersedia." },
      { status: 404 },
    );
  }

  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const status = deriveMenuStatus({
    requestedStatus: data.status,
    stock: data.stock,
    publishAt,
  });
  const menuItem = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      name: data.name,
      slug,
      description: data.description,
      category: data.category,
      originalPrice: data.originalPrice,
      discountedPrice: data.discountedPrice,
      stock: data.stock,
      imageUrl: data.imageUrl || null,
      pickupStart: data.pickupStart || restaurant.pickupStart,
      pickupEnd: data.pickupEnd || restaurant.pickupEnd,
      publishAt,
      expiresAt,
      archivedAt: status === MenuItemStatus.ARCHIVED ? new Date() : null,
      status,
    },
    include: {
      restaurant: true,
    },
  });

  if (menuItem.status === MenuItemStatus.ACTIVE) {
    await notifyRestaurantFollowers({
      restaurantId: restaurant.id,
      title: `Menu baru dari ${restaurant.name}`,
      body: `${menuItem.name} sekarang tersedia untuk pickup ${menuItem.pickupStart || restaurant.pickupStart || "18:00"} - ${menuItem.pickupEnd || restaurant.pickupEnd || "21:00"}.`,
      href: `/detail/${menuItem.id}`,
    });
  }

  return NextResponse.json({ ok: true, menuItem }, { status: 201 });
}
