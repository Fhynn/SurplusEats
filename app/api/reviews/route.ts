import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  orderCode: z.string().min(3),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(800).optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk membuat ulasan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = reviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Input ulasan tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      orderCode: parsed.data.orderCode,
      customerId: session.userId,
      status: OrderStatus.COMPLETED,
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order selesai tidak ditemukan." },
      { status: 404 },
    );
  }

  const review = await prisma.$transaction(async (tx) => {
    const savedReview = await tx.review.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        userId: session.userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment?.trim() || null,
      },
      update: {
        rating: parsed.data.rating,
        comment: parsed.data.comment?.trim() || null,
      },
    });
    const aggregate = await tx.review.aggregate({
      where: { restaurantId: order.restaurantId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.restaurant.update({
      where: { id: order.restaurantId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.rating,
      },
    });

    return savedReview;
  });

  return NextResponse.json({ ok: true, review }, { status: 201 });
}
