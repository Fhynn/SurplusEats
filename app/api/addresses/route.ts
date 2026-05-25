import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coordinateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const addressSchema = z
  .object({
    label: z.string().min(2),
    detail: z.string().min(8),
    note: z.string().optional(),
    latitude: coordinateSchema,
    longitude: coordinateSchema,
    isPrimary: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.latitude === undefined && data.longitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Lokasi otomatis wajib diaktifkan untuk customer.",
      });
    }

    if (
      (data.latitude === undefined && data.longitude !== undefined) ||
      (data.latitude !== undefined && data.longitude === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Lokasi otomatis belum lengkap. Ambil lokasi lagi.",
      });
    }

    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Lokasi otomatis tidak valid. Ambil lokasi lagi.",
      });
    }

    if (
      data.longitude !== undefined &&
      (data.longitude < -180 || data.longitude > 180)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Lokasi otomatis tidak valid. Ambil lokasi lagi.",
      });
    }
  });

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, addresses });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = addressSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Input alamat tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const addressCount = await prisma.address.count({
    where: { userId: session.userId },
  });
  const shouldBePrimary = parsed.data.isPrimary || addressCount === 0;

  const address = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    if (shouldBePrimary) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isPrimary: false },
      });
    }

    return tx.address.create({
      data: {
        userId: session.userId,
        label: parsed.data.label.trim(),
        recipient: session.name,
        phone: "-",
        addressLine: parsed.data.detail.trim(),
        city: "-",
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        notes: parsed.data.note?.trim() || null,
        isPrimary: shouldBePrimary,
      },
    });
  });

  return NextResponse.json({ ok: true, address }, { status: 201 });
}
