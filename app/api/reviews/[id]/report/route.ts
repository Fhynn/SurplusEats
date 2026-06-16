import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { reviewReportReasons } from "@/lib/review-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReviewReportRouteProps {
  params: Promise<{ id: string }>;
}

const reportSchema = z.object({
  reason: z.enum(reviewReportReasons),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: ReviewReportRouteProps) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk melaporkan ulasan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = reportSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Alasan laporan tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const review = await prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      restaurant: {
        select: {
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!review) {
    return NextResponse.json(
      { ok: false, message: "Ulasan tidak ditemukan." },
      { status: 404 },
    );
  }

  if (review.userId === session.userId) {
    return NextResponse.json(
      { ok: false, message: "Ulasan sendiri tidak bisa dilaporkan." },
      { status: 400 },
    );
  }

  const report = await prisma.reviewReport.upsert({
    where: {
      reviewId_userId: {
        reviewId: review.id,
        userId: session.userId,
      },
    },
    create: {
      reviewId: review.id,
      userId: session.userId,
      reason: parsed.data.reason,
      note: parsed.data.note || null,
    },
    update: {
      reason: parsed.data.reason,
      note: parsed.data.note || null,
      status: "OPEN",
    },
  });

  await prisma.notification.create({
    data: {
      userId: review.restaurant.ownerId,
      type: NotificationType.SYSTEM,
      title: "Ulasan toko dilaporkan",
      body: `Ada laporan ulasan di ${review.restaurant.name}: ${parsed.data.reason}.`,
      href: "/owner/reviews?filter=reported",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Laporan ulasan berhasil dikirim.",
    report,
  });
}
