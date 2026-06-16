import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  normalizeReviewRatingFilter,
  normalizeReviewSort,
} from "@/lib/review-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const ratingFilter = normalizeReviewRatingFilter(url.searchParams.get("rating"));
  const replyFilter = url.searchParams.get("reply");
  const sort = normalizeReviewSort(url.searchParams.get("sort"));
  const filter = url.searchParams.get("filter");

  const reviews = await prisma.review.findMany({
    where: {
      restaurant: { ownerId: session.userId },
      rating: ratingFilter ?? undefined,
      ownerReply:
        replyFilter === "replied"
          ? { not: null }
          : replyFilter === "unreplied"
            ? null
            : undefined,
      reports: filter === "reported" ? { some: { status: "OPEN" } } : undefined,
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
    orderBy:
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "highest"
          ? { rating: "desc" }
          : sort === "lowest"
            ? { rating: "asc" }
            : { createdAt: "desc" },
  });

  if (sort === "helpful") {
    reviews.sort(
      (firstReview, secondReview) =>
        secondReview._count.helpfulVotes - firstReview._count.helpfulVotes ||
        secondReview.createdAt.getTime() - firstReview.createdAt.getTime(),
    );
  }

  return NextResponse.json({ ok: true, reviews });
}
