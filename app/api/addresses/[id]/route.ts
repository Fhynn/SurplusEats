import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AddressRouteProps {
  params: Promise<{ id: string }>;
}

const updateAddressSchema = z.object({
  label: z.string().min(2).optional(),
  detail: z.string().min(8).optional(),
  note: z.string().optional(),
  isPrimary: z.boolean().optional(),
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

  const updatedAddress = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
