import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AddressRouteProps {
  params: Promise<{ id: string }>;
}

const coordinateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const updateAddressSchema = z
  .object({
    label: z.string().min(2).optional(),
    detail: z.string().min(8).optional(),
    note: z.string().optional(),
    latitude: coordinateSchema,
    longitude: coordinateSchema,
    isPrimary: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.latitude === undefined && data.longitude !== undefined) ||
      (data.latitude !== undefined && data.longitude === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Latitude dan longitude harus diisi bersama.",
      });
    }

    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Latitude harus berada di antara -90 dan 90.",
      });
    }

    if (
      data.longitude !== undefined &&
      (data.longitude < -180 || data.longitude > 180)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Longitude harus berada di antara -180 dan 180.",
      });
    }
  });

async function findAddress(id: string) {
  const session = await getCurrentSession();

  if (!session) {
    return { session, address: null };
  }

  const address = await prisma.address.findFirst({
    where: {
      id,
      userId: session.userId,
    },
  });

  return { session, address };
}

export async function PATCH(request: Request, { params }: AddressRouteProps) {
  const { id } = await params;
  const { session, address } = await findAddress(id);

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!address) {
    return NextResponse.json(
      { ok: false, message: "Alamat tidak ditemukan." },
      { status: 404 },
    );
  }

  const parsed = updateAddressSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Input alamat tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nextLatitude = parsed.data.latitude ?? address.latitude;
  const nextLongitude = parsed.data.longitude ?? address.longitude;

  if (nextLatitude === null || nextLongitude === null) {
    return NextResponse.json(
      {
        ok: false,
        message: "Titik maps wajib diisi untuk alamat customer.",
      },
      { status: 400 },
    );
  }

  const updatedAddress = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    if (parsed.data.isPrimary) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isPrimary: false },
      });
    }

    return tx.address.update({
      where: { id: address.id },
      data: {
        label: parsed.data.label?.trim(),
        addressLine: parsed.data.detail?.trim(),
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        notes:
          parsed.data.note === undefined
            ? undefined
            : parsed.data.note.trim() || null,
        isPrimary: parsed.data.isPrimary,
      },
    });
  });

  return NextResponse.json({ ok: true, address: updatedAddress });
}

export async function DELETE(_request: Request, { params }: AddressRouteProps) {
  const { id } = await params;
  const { session, address } = await findAddress(id);

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!address) {
    return NextResponse.json(
      { ok: false, message: "Alamat tidak ditemukan." },
      { status: 404 },
    );
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.address.delete({
      where: { id: address.id },
    });

    if (address.isPrimary) {
      const nextPrimary = await tx.address.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
      });

      if (nextPrimary) {
        await tx.address.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
