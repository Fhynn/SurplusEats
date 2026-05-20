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

  const address = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.address.updateMany({
      where: { userId: session.userId },
      data: { isPrimary: false },
    });

    const existingActiveLocation = await tx.address.findFirst({
      where: {
        userId: session.userId,
        label: "Lokasi aktif",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingActiveLocation) {
      return tx.address.update({
        where: { id: existingActiveLocation.id },
        data: {
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          addressLine: "Lokasi aktif customer",
          city: "-",
          notes: "Dipakai untuk estimasi jarak dan rute pickup.",
          isPrimary: true,
        },
      });
    }

    return tx.address.create({
      data: {
        userId: session.userId,
        label: "Lokasi aktif",
        recipient: session.name,
        phone: "-",
        addressLine: "Lokasi aktif customer",
        city: "-",
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        notes: "Dipakai untuk estimasi jarak dan rute pickup.",
        isPrimary: true,
      },
    });
  });

  return NextResponse.json({ ok: true, address }, { status: 200 });
}
