import { RefundStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RefundDetailRouteProps {
  params: Promise<{ id: string }>;
}

const updateRefundSchema = z.object({
  status: z.enum([
    RefundStatus.REVIEWING,
    RefundStatus.APPROVED,
    RefundStatus.REJECTED,
    RefundStatus.PAID,
  ]),
  adminNote: z.string().optional(),
});

export async function GET(_request: Request, { params }: RefundDetailRouteProps) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const refund = await prisma.refundRequest.findFirst({
    where: {
      OR: [{ id }, { order: { orderCode: id } }],
    },
    include: {
      customer: true,
      evidence: { include: { asset: true } },
      order: {
        include: {
          items: true,
          restaurant: { include: { owner: true } },
        },
      },
    },
  });

  if (!refund) {
    return NextResponse.json(
      { ok: false, message: "Refund tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, refund });
}

export async function PATCH(
  request: Request,
  { params }: RefundDetailRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const parsed = updateRefundSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status refund tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existingRefund = await prisma.refundRequest.findFirst({
    where: { OR: [{ id }, { order: { orderCode: id } }] },
  });

  if (!existingRefund) {
    return NextResponse.json(
      { ok: false, message: "Refund tidak ditemukan." },
      { status: 404 },
    );
  }

  const refund = await prisma.refundRequest.update({
    where: { id: existingRefund.id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      reviewedAt:
        parsed.data.status === RefundStatus.APPROVED ||
        parsed.data.status === RefundStatus.REJECTED
          ? new Date()
          : undefined,
      paidAt: parsed.data.status === RefundStatus.PAID ? new Date() : undefined,
    },
    include: { order: true },
  });

  await prisma.adminActionLog.create({
    data: {
      adminId: session.userId,
      action: `REFUND_${parsed.data.status}`,
      targetType: "refund_request",
      targetId: refund.id,
      metadata: { adminNote: parsed.data.adminNote },
    },
  });

  return NextResponse.json({ ok: true, refund });
}
