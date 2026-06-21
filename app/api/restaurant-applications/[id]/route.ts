import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/admin-permissions";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { invalidateCacheTags } from "@/lib/server-cache";

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
  const auth = await requireAdminPermission("VERIFICATIONS_REVIEW");

  if (auth.response) {
    return auth.response;
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
  const auth = await requireAdminPermission("VERIFICATIONS_REVIEW");

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminApplicationReview,
    auth.session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
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
          reviewedById: auth.session.userId,
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
          createdById: auth.session.userId,
        },
      });
    }

    await tx.adminActionLog.create({
      data: {
        adminId: auth.session.userId,
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

  await invalidateCacheTags(["admin-dashboard"]);

  return NextResponse.json({ ok: true, application: updatedApplication });
}
