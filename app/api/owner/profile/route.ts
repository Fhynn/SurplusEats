import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { getStorePickupCoordinateIssue } from "@/lib/location-quality";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coordinateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const updateRestaurantLocationSchema = z
  .object({
    latitude: coordinateSchema,
    longitude: coordinateSchema,
  })
  .superRefine((data, ctx) => {
    if (data.latitude === undefined && data.longitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Titik lokasi toko wajib diisi.",
      });
    }

    if (
      (data.latitude === undefined && data.longitude !== undefined) ||
      (data.latitude !== undefined && data.longitude === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Titik lokasi toko belum lengkap. Klik Ambil Lokasi lagi.",
      });
    }

    if (data.latitude !== undefined && data.longitude !== undefined) {
      const coordinateIssue = getStorePickupCoordinateIssue({
        latitude: data.latitude,
        longitude: data.longitude,
      });

      if (coordinateIssue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latitude"],
          message: coordinateIssue,
        });
      }
    }
  });

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      applications: {
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
        },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
      ownedRestaurants: {
        include: {
          menuItems: true,
          orders: true,
          reviews: true,
          verificationDocuments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Owner tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    owner: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    restaurant: user.ownedRestaurants[0] ?? null,
    latestApplication: user.applications[0] ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = updateRestaurantLocationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Titik lokasi toko tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return NextResponse.json(
      { ok: false, message: "Restoran owner belum tersedia." },
      { status: 404 },
    );
  }

  const updatedRestaurant = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  return NextResponse.json({
    ok: true,
    restaurant: updatedRestaurant,
  });
}
