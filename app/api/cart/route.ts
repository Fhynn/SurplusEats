import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addCartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

const updateCartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
});

function isCustomerSession(
  session: Awaited<ReturnType<typeof getCurrentSession>>,
): session is NonNullable<Awaited<ReturnType<typeof getCurrentSession>>> & {
  role: typeof UserRole.CUSTOMER;
} {
  return session?.role === UserRole.CUSTOMER;
}

async function findActiveMenuItem(menuItemId: string) {
  return prisma.menuItem.findFirst({
    where: {
      id: menuItemId,
      status: MenuItemStatus.ACTIVE,
      restaurant: { status: RestaurantStatus.APPROVED },
    },
    select: {
      id: true,
      stock: true,
    },
  });
}

export async function GET() {
  const session = await getCurrentSession();

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId: session.userId,
      menuItem: {
        status: MenuItemStatus.ACTIVE,
        restaurant: { status: RestaurantStatus.APPROVED },
      },
    },
    include: {
      menuItem: {
        include: {
          restaurant: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ ok: true, cartItems });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = addCartItemSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Item cart tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const menuItem = await findActiveMenuItem(parsed.data.menuItemId);

  if (!menuItem) {
    return NextResponse.json(
      { ok: false, message: "Menu tidak tersedia." },
      { status: 404 },
    );
  }

  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      userId_menuItemId: {
        userId: session.userId,
        menuItemId: menuItem.id,
      },
    },
  });
  const nextQuantity = Math.min(
    menuItem.stock,
    20,
    (existingCartItem?.quantity ?? 0) + parsed.data.quantity,
  );

  if (nextQuantity < 1) {
    return NextResponse.json(
      { ok: false, message: "Stok menu tidak cukup." },
      { status: 400 },
    );
  }

  const cartItem = await prisma.cartItem.upsert({
    where: {
      userId_menuItemId: {
        userId: session.userId,
        menuItemId: menuItem.id,
      },
    },
    update: { quantity: nextQuantity },
    create: {
      userId: session.userId,
      menuItemId: menuItem.id,
      quantity: nextQuantity,
    },
    include: {
      menuItem: {
        include: {
          restaurant: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, cartItem }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = updateCartItemSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Item cart tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const menuItem = await findActiveMenuItem(parsed.data.menuItemId);

  if (!menuItem) {
    return NextResponse.json(
      { ok: false, message: "Menu tidak tersedia." },
      { status: 404 },
    );
  }

  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      userId_menuItemId: {
        userId: session.userId,
        menuItemId: menuItem.id,
      },
    },
  });

  if (!existingCartItem) {
    return NextResponse.json(
      { ok: false, message: "Item tidak ada di keranjang." },
      { status: 404 },
    );
  }

  const nextQuantity = Math.min(menuItem.stock, 20, parsed.data.quantity);

  if (nextQuantity < 1) {
    return NextResponse.json(
      { ok: false, message: "Stok menu tidak cukup." },
      { status: 400 },
    );
  }

  const cartItem = await prisma.cartItem.update({
    where: {
      userId_menuItemId: {
        userId: session.userId,
        menuItemId: menuItem.id,
      },
    },
    data: { quantity: nextQuantity },
    include: {
      menuItem: {
        include: {
          restaurant: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, cartItem });
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const menuItemId = url.searchParams.get("menuItemId");

  await prisma.cartItem.deleteMany({
    where: {
      userId: session.userId,
      menuItemId: menuItemId || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
