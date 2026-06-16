import { put } from "@vercel/blob";
import {
  ApplicationStatus,
  AssetVisibility,
  NotificationType,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { deliverNotifications } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  documentUploadTypes,
  validateUploadFile,
} from "@/lib/upload-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ApplicationDocumentRouteProps {
  params: Promise<{ id: string }>;
}

const maxDocumentSize = 6 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: ApplicationDocumentRouteProps,
) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const rateLimit = await enforceRateLimit(
    request,
    {
      keyPrefix: "owner-document-revision",
      max: 12,
      windowMs: 60 * 60 * 1000,
      message: "Terlalu banyak upload dokumen. Tunggu beberapa menit lalu coba lagi.",
      auditAction: "OWNER_DOCUMENT_UPLOAD_RATE_LIMIT_BLOCKED",
    },
    [session.userId],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const { id } = await params;
  const formData = await request.formData();
  const documentId = String(formData.get("documentId") || "");
  const file = formData.get("file");

  if (!documentId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, message: "Dokumen pengganti wajib dipilih." },
      { status: 400 },
    );
  }

  const validation = await validateUploadFile(file, {
    allowedMimeTypes: documentUploadTypes,
    maxSizeBytes: maxDocumentSize,
    maxSizeMessage: "Ukuran dokumen maksimal 6MB.",
    unsupportedMessage: "Dokumen harus JPG, PNG, WEBP, atau PDF.",
  });

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: 400 },
    );
  }

  const application = await prisma.restaurantApplication.findFirst({
    where: {
      id,
      userId: session.userId,
    },
    include: {
      documents: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { ok: false, message: "Pengajuan mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  if (application.status === ApplicationStatus.APPROVED) {
    return NextResponse.json(
      { ok: false, message: "Dokumen toko yang sudah disetujui tidak dapat direvisi." },
      { status: 409 },
    );
  }

  const document = application.documents.find((item) => item.id === documentId);

  if (!document) {
    return NextResponse.json(
      { ok: false, message: "Dokumen tidak termasuk dalam pengajuan ini." },
      { status: 400 },
    );
  }

  if (
    application.status !== ApplicationStatus.REJECTED &&
    document.status !== "rejected"
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Dokumen hanya dapat diganti setelah admin meminta revisi.",
      },
      { status: 409 },
    );
  }

  const nextRevision = document.revision + 1;
  const filename = `${slugify(document.type)}-rev-${nextRevision}-${crypto.randomUUID()}.${validation.extension}`;
  const pathname = `restaurant-verifications/${slugify(application.email)}/${filename}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  const result = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const asset = await tx.asset.create({
        data: {
          uploadedById: session.userId,
          url: blob.url,
          pathname: blob.pathname,
          contentType: validation.contentType,
          size: file.size,
          visibility: AssetVisibility.PUBLIC,
          entityType: "restaurant_application",
          entityId: application.id,
        },
      });

      const updatedDocument = await tx.verificationDocument.update({
        where: { id: document.id },
        data: {
          assetId: asset.id,
          status: "submitted",
          reviewNote: null,
          reviewedAt: null,
          reviewedById: null,
          revision: nextRevision,
        },
      });

      await tx.verificationDocumentRevision.create({
        data: {
          verificationDocumentId: document.id,
          assetId: asset.id,
          revision: nextRevision,
          status: "submitted",
          event: "REPLACED",
          createdById: session.userId,
        },
      });

      const updatedApplication = await tx.restaurantApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.PENDING,
          adminNote: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
      });

      const admins = await tx.user.findMany({
        where: {
          role: UserRole.ADMIN,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: "Dokumen mitra direvisi",
            body: `${application.businessName} mengunggah revisi ${document.label}.`,
            href: `/admin/verifications/${application.id}`,
          })),
        });
      }

      await tx.notification.create({
        data: {
          userId: session.userId,
          type: NotificationType.SYSTEM,
          title: "Revisi dokumen terkirim",
          body: `${document.label} versi ${nextRevision} menunggu review admin.`,
          href: "/owner/verify",
        },
      });

      return {
        admins,
        asset,
        application: updatedApplication,
        document: updatedDocument,
      };
    },
  );

  await deliverNotifications([
    ...result.admins.map((admin) => ({
      userId: admin.id,
      type: NotificationType.SYSTEM,
      title: "Dokumen mitra direvisi",
      body: `${application.businessName} mengunggah revisi ${document.label}.`,
      href: `/admin/verifications/${application.id}`,
    })),
    {
      userId: session.userId,
      type: NotificationType.SYSTEM,
      title: "Revisi dokumen terkirim",
      body: `${document.label} versi ${nextRevision} menunggu review admin.`,
      href: "/owner/verify",
    },
  ]);

  return NextResponse.json({
    ok: true,
    application: result.application,
    document: result.document,
  });
}
