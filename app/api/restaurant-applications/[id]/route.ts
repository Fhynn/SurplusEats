import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RestaurantApplicationDetailRouteProps {
  params: Promise<{ id: string }>;
}

const documentReviewSchema = z.object({
  reviews: z
    .array(
      z.object({
        documentId: z.string().min(1),
        status: z.enum(["accepted", "rejected"]),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .min(1),
});

export async function GET(
  _request: Request,
  { params }: RestaurantApplicationDetailRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const application = await prisma.restaurantApplication.findUnique({
    where: { id },
    include: {
      documents: {
        include: {
          asset: true,
          revisions: {
            include: { asset: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      restaurant: true,
      user: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { ok: false, message: "Pengajuan mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, application });
}

export async function PATCH(
  request: Request,
  { params }: RestaurantApplicationDetailRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = documentReviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Checklist dokumen tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const application = await prisma.restaurantApplication.findUnique({
    where: { id },
    include: { documents: true },
  });

  if (!application) {
    return NextResponse.json(
      { ok: false, message: "Pengajuan mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  if (application.status === "APPROVED") {
    return NextResponse.json(
      {
        ok: false,
        message: "Dokumen pengajuan yang sudah disetujui tidak dapat diubah.",
      },
      { status: 409 },
    );
  }

  const documentsById = new Map(
    application.documents.map((document) => [document.id, document]),
  );

  for (const review of parsed.data.reviews) {
    const document = documentsById.get(review.documentId);

    if (!document) {
      return NextResponse.json(
        { ok: false, message: "Dokumen tidak termasuk dalam pengajuan ini." },
        { status: 400 },
      );
    }

    if (review.status === "rejected" && (review.note?.length ?? 0) < 5) {
      return NextResponse.json(
        {
          ok: false,
          message: `Alasan penolakan ${document.label} minimal 5 karakter.`,
        },
        { status: 400 },
      );
    }
  }

  const changedReviews = parsed.data.reviews.filter((review) => {
    const document = documentsById.get(review.documentId);

    return (
      document &&
      (document.status !== review.status ||
        (document.reviewNote || "") !== (review.note || ""))
    );
  });

  if (changedReviews.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Checklist dokumen tidak berubah.",
    });
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    for (const review of changedReviews) {
      const document = documentsById.get(review.documentId);

      if (!document) {
        continue;
      }

      await tx.verificationDocument.update({
        where: { id: document.id },
        data: {
          status: review.status,
          reviewNote: review.note || null,
          reviewedAt: new Date(),
          reviewedById: session.userId,
        },
      });

      await tx.verificationDocumentRevision.create({
        data: {
          verificationDocumentId: document.id,
          assetId: document.assetId,
          revision: document.revision,
          status: review.status,
          note: review.note || null,
          event: "REVIEWED",
          createdById: session.userId,
        },
      });
    }

    await tx.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: "REVIEW_RESTAURANT_DOCUMENTS",
        targetType: "restaurant_application",
        targetId: application.id,
        metadata: {
          reviews: changedReviews,
        },
      },
    });
  });

  const updatedApplication = await prisma.restaurantApplication.findUnique({
    where: { id },
    include: {
      documents: {
        include: {
          asset: true,
          revisions: {
            include: { asset: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      restaurant: true,
      user: true,
    },
  });

  return NextResponse.json({ ok: true, application: updatedApplication });
}
