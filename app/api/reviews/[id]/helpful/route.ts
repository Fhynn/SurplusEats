import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReviewHelpfulRouteProps {
  params: Promise<{ id: string }>;
}

async function getReviewForAction(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
    },
  });
}

async function getHelpfulState(reviewId: string, userId: string) {
  const [helpfulCount, helpfulVote] = await Promise.all([
    prisma.reviewHelpful.count({ where: { reviewId } }),
    prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
      select: { id: true },
    }),
  ]);

  return {
    helpfulCount,
    isHelpful: Boolean(helpfulVote),
  };
}

export async function POST(
  _request: Request,
  { params }: ReviewHelpfulRouteProps,
) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const review = await getReviewForAction(id);

  if (!review) {
    return NextResponse.json(
      { ok: false, message: "Ulasan tidak ditemukan." },
      { status: 404 },
    );
  }

  if (review.userId === session.userId) {
    return NextResponse.json(
      { ok: false, message: "Ulasan sendiri tidak bisa ditandai helpful." },
      { status: 400 },
    );
  }

  await prisma.reviewHelpful.upsert({
    where: {
      reviewId_userId: {
        reviewId: review.id,
        userId: session.userId,
      },
    },
    create: {
      reviewId: review.id,
      userId: session.userId,
    },
    update: {},
  });

  return NextResponse.json({
    ok: true,
    ...(await getHelpfulState(review.id, session.userId)),
  });
}

export async function DELETE(
  _request: Request,
  { params }: ReviewHelpfulRouteProps,
) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  await prisma.reviewHelpful
    .delete({
      where: {
        reviewId_userId: {
          reviewId: id,
          userId: session.userId,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({
    ok: true,
    ...(await getHelpfulState(id, session.userId)),
  });
}
