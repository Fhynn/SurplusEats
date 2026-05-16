import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addressSchema = z.object({
  label: z.string().min(2),
  detail: z.string().min(8),
  note: z.string().optional(),
  isPrimary: z.boolean().optional(),
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
        notes: parsed.data.note?.trim() || null,
        isPrimary: shouldBePrimary,
      },
    });
  });

  return NextResponse.json({ ok: true, address }, { status: 201 });
}
