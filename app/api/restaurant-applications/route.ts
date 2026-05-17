import {
  ApplicationStatus,
  RestaurantStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  applicationId: z.string(),
  status: z.enum([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
  adminNote: z.string().optional(),
});
const validApplicationStatuses = new Set<string>(Object.values(ApplicationStatus));

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

  const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const existingApplication = await tx.restaurantApplication.findUnique({
      where: { id: data.applicationId },
      select: { id: true },
    });

    if (!existingApplication) {
      return null;
    }

    const application = await tx.restaurantApplication.update({
      where: { id: existingApplication.id },
      data: {
        status: data.status,
        adminNote: data.adminNote,
        reviewedAt: new Date(),
      },
      include: { user: true },
    });

    let restaurant = null;

    if (data.status === ApplicationStatus.APPROVED && application.userId) {
      restaurant = await tx.restaurant.upsert({
        where: { slug: slugify(application.businessName) },
        update: {
          ownerId: application.userId,
          applicationId: application.id,
          name: application.businessName,
          description: application.description,
          address: application.address,
          city: application.city,
          phone: application.phone,
          status: RestaurantStatus.APPROVED,
        },
        create: {
          ownerId: application.userId,
          applicationId: application.id,
          name: application.businessName,
          slug: slugify(application.businessName),
          description: application.description,
          address: application.address,
          city: application.city,
          phone: application.phone,
          status: RestaurantStatus.APPROVED,
          pickupStart: "18:00",
          pickupEnd: "21:00",
        },
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
        },
      },
    });

    return { application, restaurant };
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Pendaftaran mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
