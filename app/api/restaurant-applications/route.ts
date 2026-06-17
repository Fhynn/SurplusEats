import {
  ApplicationStatus,
  RestaurantStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { getStorePickupCoordinateIssue } from "@/lib/location-quality";
import { deliverNotifications } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { invalidateCacheTags } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  applicationId: z.string(),
  status: z.enum([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
  adminNote: z.string().trim().max(1000).optional(),
  checklist: z
    .object({
      identityMatches: z.boolean(),
      businessPermitValid: z.boolean(),
      storefrontMatches: z.boolean(),
      pickupLocationValid: z.boolean(),
    })
    .optional(),
});
const validApplicationStatuses = new Set<string>(Object.values(ApplicationStatus));
const requiredDocumentTypes = [
  "IDENTITY",
  "BUSINESS_PERMIT",
  "STOREFRONT_PHOTO",
] as const;

async function createUniqueRestaurantSlug(
  tx: PrismaTransactionClient,
  businessName: string,
) {
  const baseSlug = slugify(businessName) || "restaurant";
  let slug = baseSlug;
  let suffix = 2;

  while (
    await tx.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  if (statusParam && !validApplicationStatuses.has(statusParam)) {
    return NextResponse.json(
      { ok: false, message: "Status verifikasi tidak valid." },
      { status: 400 },
    );
  }

  const status = statusParam as ApplicationStatus | null;

  const applications = await prisma.restaurantApplication.findMany({
    where: status ? { status } : undefined,
    include: {
      documents: true,
      restaurant: true,
      user: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ ok: true, applications });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Gunakan endpoint pendaftaran mitra terbaru.",
    },
    { status: 410 },
  );
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminApplicationReview,
    session,
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = reviewSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data review mitra tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  let result: {
    application: { userId: string | null };
    restaurant: object | null;
  } | null = null;

  try {
    result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const existingApplication = await tx.restaurantApplication.findUnique({
        where: { id: data.applicationId },
        select: { id: true },
      });

      if (!existingApplication) {
        return null;
      }

      const existingApplicationData = await tx.restaurantApplication.findUnique({
        where: { id: existingApplication.id },
        include: {
          documents: true,
          restaurant: true,
          user: true,
        },
      });

      if (!existingApplicationData) {
        return null;
      }

      if (
        data.status === ApplicationStatus.APPROVED
      ) {
        const missingChecklist = !data.checklist;
        const incompleteChecklist =
          !data.checklist ||
          Object.values(data.checklist).some((checked) => !checked);
        const documentsByType = new Map(
          existingApplicationData.documents.map((document) => [
            document.type,
            document,
          ]),
        );
        const incompleteDocuments = requiredDocumentTypes.filter((type) => {
          const document = documentsByType.get(type);

          return !document?.assetId || document.status !== "accepted";
        });

        if (missingChecklist || incompleteChecklist) {
          throw new Error(
            "Lengkapi seluruh checklist verifikasi sebelum menyetujui mitra.",
          );
        }

        if (incompleteDocuments.length > 0) {
          throw new Error(
            "Semua dokumen wajib harus berstatus diterima sebelum mitra disetujui.",
          );
        }

        const coordinateIssue = getStorePickupCoordinateIssue(
          existingApplicationData.latitude !== null &&
            existingApplicationData.longitude !== null
            ? {
                latitude: existingApplicationData.latitude,
                longitude: existingApplicationData.longitude,
              }
            : null,
        );

        if (coordinateIssue) {
          throw new Error(
            `${coordinateIssue} Mitra wajib melengkapi lokasi sebelum disetujui.`,
          );
        }
      }

      if (
        data.status === ApplicationStatus.REJECTED &&
        (data.adminNote?.length ?? 0) < 10
      ) {
        throw new Error("Alasan penolakan minimal 10 karakter.");
      }

      const application = await tx.restaurantApplication.update({
        where: { id: existingApplicationData.id },
        data: {
          status: data.status,
          adminNote: data.adminNote,
          reviewedAt: new Date(),
        },
        include: { user: true },
      });

      let restaurant = null;

      if (data.status === ApplicationStatus.APPROVED && application.userId) {
        const restaurantData = {
          ownerId: application.userId,
          applicationId: application.id,
          name: application.businessName,
          description: application.description,
          address: application.address,
          city: application.city,
          latitude: application.latitude,
          longitude: application.longitude,
          phone: application.phone,
          bankName: application.bankName,
          bankAccountNumber: application.bankAccountNumber,
          bankAccountHolder: application.bankAccountHolder,
          status: RestaurantStatus.APPROVED,
        };

        if (existingApplicationData.restaurant) {
          restaurant = await tx.restaurant.update({
            where: { id: existingApplicationData.restaurant.id },
            data: restaurantData,
          });
        } else {
          restaurant = await tx.restaurant.create({
            data: {
              ...restaurantData,
              slug: await createUniqueRestaurantSlug(tx, application.businessName),
              pickupStart: "18:00",
              pickupEnd: "21:00",
            },
          });
        }
      } else if (
        data.status === ApplicationStatus.REJECTED &&
        existingApplicationData.restaurant
      ) {
        restaurant = await tx.restaurant.update({
          where: { id: existingApplicationData.restaurant.id },
          data: { status: RestaurantStatus.REJECTED },
        });
      }

      if (application.userId) {
        await tx.notification.create({
          data: {
            userId: application.userId,
            type: "SYSTEM",
            title:
              data.status === ApplicationStatus.APPROVED
                ? "Pendaftaran mitra disetujui"
                : "Pendaftaran mitra ditolak",
            body:
              data.status === ApplicationStatus.APPROVED
                ? "Dashboard owner sudah bisa digunakan untuk mulai berjualan."
                : data.adminNote || "Admin belum bisa menyetujui data usaha.",
            href:
              data.status === ApplicationStatus.APPROVED
                ? "/owner/dashboard"
                : "/owner/verify",
          },
        });
      }

      await tx.adminActionLog.create({
        data: {
          adminId: session.userId,
          action:
            data.status === ApplicationStatus.APPROVED
              ? "APPROVE_RESTAURANT_APPLICATION"
              : "REJECT_RESTAURANT_APPLICATION",
          targetType: "restaurant_application",
          targetId: application.id,
          metadata: {
            adminNote: data.adminNote,
            checklist: data.checklist,
            documents: existingApplicationData.documents.map((document) => ({
              id: document.id,
              type: document.type,
              status: document.status,
              revision: document.revision,
            })),
          },
        },
      });

      return { application, restaurant };
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Review pengajuan gagal.",
      },
      { status: 400 },
    );
  }

  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Pendaftaran mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  if (result.application.userId) {
    await deliverNotifications([
      {
        userId: result.application.userId,
        type: "SYSTEM",
        title:
          data.status === ApplicationStatus.APPROVED
            ? "Pendaftaran mitra disetujui"
            : "Pendaftaran mitra ditolak",
        body:
          data.status === ApplicationStatus.APPROVED
            ? "Dashboard owner sudah bisa digunakan untuk mulai berjualan."
            : data.adminNote || "Admin belum bisa menyetujui data usaha.",
        href:
          data.status === ApplicationStatus.APPROVED
            ? "/owner/dashboard"
            : "/owner/verify",
      },
    ]);
  }

  await invalidateCacheTags(["admin-dashboard", "menu-items:public"]);

  return NextResponse.json({ ok: true, ...result });
}
