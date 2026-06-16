import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const activeLocationSchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  label: z.string().trim().min(2).max(80).optional(),
  addressLine: z.string().trim().min(2).max(240).optional(),
  accuracy: z.coerce.number().finite().nonnegative().max(50_000).optional(),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk menyimpan lokasi." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = activeLocationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Titik lokasi tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const locationLabel = parsed.data.label || "Lokasi aktif";
  const addressLine = parsed.data.addressLine || "Lokasi aktif customer";
  const notes =
    parsed.data.accuracy !== undefined
      ? `Dipakai untuk estimasi jarak dan rute pickup. Akurasi sekitar ${Math.round(parsed.data.accuracy)} m.`
      : "Dipakai untuk estimasi jarak dan rute pickup.";

  const address = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.address.updateMany({
      where: { userId: session.userId },
      data: { isPrimary: false },
    });

    const existingActiveLocation = await tx.address.findFirst({
      where: {
        userId: session.userId,
        OR: [
          { label: "Lokasi aktif" },
          {
            notes: {
              startsWith: "Dipakai untuk estimasi jarak dan rute pickup",
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingActiveLocation) {
      return tx.address.update({
        where: { id: existingActiveLocation.id },
        data: {
          label: locationLabel,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          addressLine,
          city: "-",
          notes,
          isPrimary: true,
        },
      });
    }

    return tx.address.create({
      data: {
        userId: session.userId,
        label: locationLabel,
        recipient: session.name,
        phone: "-",
        addressLine,
        city: "-",
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        notes,
        isPrimary: true,
      },
    });
  });

  return NextResponse.json({ ok: true, address }, { status: 200 });
}
