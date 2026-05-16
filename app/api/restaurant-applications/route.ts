import {
  ApplicationStatus,
  RestaurantStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const applicationSchema = z.object({
  applicantName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  businessName: z.string().min(3),
  businessType: z.string().min(2),
  address: z.string().min(8),
  city: z.string().min(2),
  description: z.string().optional(),
});

const reviewSchema = z.object({
  applicationId: z.string(),
  status: z.enum([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
  adminNote: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ApplicationStatus | null;

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

export async function POST(request: Request) {
  const parsed = applicationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data pendaftaran mitra tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.applicantName,
      phone: data.phone,
      role: UserRole.OWNER,
    },
    create: {
      email: data.email,
      name: data.applicantName,
      phone: data.phone,
      role: UserRole.OWNER,
    },
  });

  const application = await prisma.restaurantApplication.create({
    data: {
      userId: user.id,
      applicantName: data.applicantName,
      email: data.email,
      phone: data.phone,
      businessName: data.businessName,
      businessType: data.businessType,
      address: data.address,
      city: data.city,
      description: data.description,
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Pendaftaran mitra diterima",
      body: "Admin akan meninjau data usaha kamu sebelum dashboard owner dibuka.",
      href: "/owner/verify",
    },
  });

  return NextResponse.json({ ok: true, application }, { status: 201 });
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

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.restaurantApplication.update({
      where: { id: data.applicationId },
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

  return NextResponse.json({ ok: true, ...result });
}
