import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OwnerReviewRouteProps {
  params: Promise<{
    id: string;
  }>;
}

const ownerReviewReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(3, "Balasan minimal 3 karakter.")
    .max(500, "Balasan maksimal 500 karakter."),
});

export async function PATCH(request: Request, { params }: OwnerReviewRouteProps) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = ownerReviewReplySchema.safeParse(await request.json());

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;

    return NextResponse.json(
      {
        ok: false,
        message: firstIssue || "Balasan ulasan tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;

  const existingReview = await prisma.review.findFirst({
    where: {
      id,
      restaurant: {
        ownerId: session.userId,
      },
    },
    include: {
      restaurant: {
        select: {
          name: true,
        },
      },
      order: {
        select: {
          orderCode: true,
        },
      },
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingReview) {
    return NextResponse.json(
      { ok: false, message: "Ulasan tidak ditemukan untuk toko ini." },
      { status: 404 },
    );
  }

  const review = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const updatedReview = await tx.review.update({
      where: { id: existingReview.id },
      data: {
        ownerReply: parsed.data.reply,
        ownerRepliedAt: new Date(),
      },
      include: {
        images: {
          include: {
            asset: true,
          },
        },
        order: true,
        restaurant: true,
        user: true,
        _count: {
          select: {
            helpfulVotes: true,
            reports: true,
          },
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: existingReview.user.id,
        type: NotificationType.SYSTEM,
        title: "Toko membalas ulasanmu",
        body: `${existingReview.restaurant.name} membalas ulasan untuk order ${existingReview.order.orderCode}.`,
        href: `/stores/${updatedReview.restaurantId}`,
      },
    });

    return updatedReview;
  });

  return NextResponse.json({ ok: true, review });
}
