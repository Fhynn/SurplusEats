import { NotificationType, RefundMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refundSchema = z.object({
  orderCode: z.string().min(3),
  customerEmail: z.string().email().optional(),
  reason: z.string().min(3),
  description: z.string().min(12),
  method: z.enum([RefundMethod.GOPAY, RefundMethod.BANK_TRANSFER]),
  evidenceAssetIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customerEmail = url.searchParams.get("customerEmail");

  const refunds = await prisma.refundRequest.findMany({
    where: {
      customer:
        session.role === "CUSTOMER"
          ? { id: session.userId }
          : customerEmail
            ? { email: customerEmail }
            : undefined,
      order:
        session.role === "OWNER"
          ? { restaurant: { ownerId: session.userId } }
          : undefined,
    },
    include: {
      customer: true,
      evidence: { include: { asset: true } },
      order: {
        include: {
          restaurant: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, refunds });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk refund." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = refundSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data refund tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const order = await prisma.order.findUnique({
    where: { orderCode: data.orderCode },
    include: { customer: true, restaurant: true },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  if (order.customerId !== session.userId) {
    return NextResponse.json(
      { ok: false, message: "Order bukan milik customer ini." },
      { status: 403 },
    );
  }

  const refund = await prisma.refundRequest.upsert({
    where: { orderId: order.id },
    update: {
      reason: data.reason,
      description: data.description,
      method: data.method,
      amount: order.total,
      evidence: {
        deleteMany: {},
        create: (data.evidenceAssetIds || []).map((assetId) => ({
          assetId,
        })),
      },
    },
    create: {
      orderId: order.id,
      customerId: order.customerId,
      reason: data.reason,
      description: data.description,
      method: data.method,
      amount: order.total,
      evidence: {
        create: (data.evidenceAssetIds || []).map((assetId) => ({
          assetId,
        })),
      },
    },
    include: {
      evidence: {
        include: {
          asset: true,
        },
      },
      order: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.REFUND,
      title: "Refund sedang ditinjau",
      body: `Pengajuan refund ${order.orderCode} masuk ke admin.`,
      href: "/notifications",
    },
  });

  return NextResponse.json({ ok: true, refund }, { status: 201 });
}
