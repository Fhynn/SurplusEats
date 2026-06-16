import {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  RefundMethod,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { deliverNotifications } from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { isValidRefundReason } from "@/lib/refund-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refundSchema = z.object({
  orderCode: z.string().min(3),
  customerEmail: z.string().email().optional(),
  reason: z.string().min(3),
  description: z.string().min(12),
  method: z.enum([RefundMethod.GOPAY, RefundMethod.BANK_TRANSFER]),
  evidenceAssetIds: z.array(z.string()).max(5).optional(),
});

const refundableStatuses = new Set<OrderStatus>([
  OrderStatus.READY,
  OrderStatus.COMPLETED,
]);

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

  if (!session || session.role !== UserRole.CUSTOMER) {
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

  if (!isValidRefundReason(data.reason)) {
    return NextResponse.json(
      { ok: false, message: "Pilih alasan refund resmi yang tersedia." },
      { status: 400 },
    );
  }

  const evidenceAssetIds = Array.from(new Set(data.evidenceAssetIds || []));
  const order = await prisma.order.findUnique({
    where: { orderCode: data.orderCode },
    include: {
      customer: true,
      refundRequest: true,
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
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

  if (
    order.paymentStatus !== PaymentStatus.PAID ||
    !refundableStatuses.has(order.status)
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Refund hanya bisa diajukan untuk pesanan yang sudah dibayar dan siap/selesai.",
      },
      { status: 400 },
    );
  }

  if (order.refundRequest) {
    return NextResponse.json(
      {
        ok: false,
        message: `Refund untuk ${order.orderCode} sudah pernah diajukan dengan status ${order.refundRequest.status}.`,
      },
      { status: 409 },
    );
  }

  if (evidenceAssetIds.length > 0) {
    const ownedEvidenceCount = await prisma.asset.count({
      where: {
        id: { in: evidenceAssetIds },
        uploadedById: session.userId,
      },
    });

    if (ownedEvidenceCount !== evidenceAssetIds.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "Bukti refund tidak valid atau bukan milik akun ini.",
        },
        { status: 400 },
      );
    }
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });

  const refund = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const createdRefund = await tx.refundRequest.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        reason: data.reason,
        description: data.description,
        method: data.method,
        amount: order.total,
        evidence: {
          create: evidenceAssetIds.map((assetId) => ({
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

    await tx.notification.createMany({
      data: [
        {
          userId: order.customerId,
          type: NotificationType.REFUND,
          title: "Refund sedang ditinjau",
          body: `Pengajuan refund ${order.orderCode} masuk ke admin.`,
          href: `/orders/${order.orderCode}/refund`,
        },
        {
          userId: order.restaurant.ownerId,
          type: NotificationType.REFUND,
          title: "Refund baru dari customer",
          body: `${order.customer.name} mengajukan refund untuk ${order.orderCode}.`,
          href: `/owner/orders/${order.orderCode}`,
        },
        ...admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.REFUND,
          title: "Pengajuan refund baru",
          body: `${order.orderCode} dari ${order.restaurant.name} menunggu review admin.`,
          href: `/admin/refunds/${createdRefund.id}`,
        })),
      ],
    });

    return createdRefund;
  });

  await deliverNotifications([
    {
      userId: order.customerId,
      type: NotificationType.REFUND,
      title: "Refund sedang ditinjau",
      body: `Pengajuan refund ${order.orderCode} masuk ke admin.`,
      href: `/orders/${order.orderCode}/refund`,
    },
    {
      userId: order.restaurant.ownerId,
      type: NotificationType.REFUND,
      title: "Refund baru dari customer",
      body: `${order.customer.name} mengajukan refund untuk ${order.orderCode}.`,
      href: `/owner/orders/${order.orderCode}`,
    },
    ...admins.map((admin) => ({
      userId: admin.id,
      type: NotificationType.REFUND,
      title: "Pengajuan refund baru",
      body: `${order.orderCode} dari ${order.restaurant.name} menunggu review admin.`,
      href: `/admin/refunds/${refund.id}`,
    })),
  ]);

  return NextResponse.json({ ok: true, refund }, { status: 201 });
}
