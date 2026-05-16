import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { NotificationType, OrderStatus, PaymentStatus, UserRole } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderDetailRouteProps {
  params: Promise<{ id: string }>;
}

const updateOrderStatusSchema = z.object({
  status: z.enum([
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ]),
});

export async function GET(_request: Request, { params }: OrderDetailRouteProps) {
  const { id } = await params;
  const session = await getCurrentSession();
  const order = await prisma.order.findFirst({
    where: {
      orderCode: id,
      customerId: session?.role === "CUSTOMER" ? session.userId : undefined,
      restaurant:
        session?.role === "OWNER" ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
      refundRequest: true,
      restaurant: {
        include: {
          owner: true,
        },
      },
      review: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, order });
}

export async function PATCH(request: Request, { params }: OrderDetailRouteProps) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session || (session.role !== UserRole.OWNER && session.role !== UserRole.ADMIN)) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = updateOrderStatusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status order tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      orderCode: id,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: true,
      restaurant: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const nextStatus = parsed.data.status;
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      paymentStatus:
        nextStatus === OrderStatus.CANCELLED
          ? PaymentStatus.REFUNDED
          : order.paymentStatus,
      completedAt: nextStatus === OrderStatus.COMPLETED ? new Date() : undefined,
      cancelledAt: nextStatus === OrderStatus.CANCELLED ? new Date() : undefined,
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
      refundRequest: true,
      restaurant: {
        include: {
          owner: true,
        },
      },
      review: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.ORDER,
      title:
        nextStatus === OrderStatus.CANCELLED
          ? "Pesanan dibatalkan"
          : "Status pesanan diperbarui",
      body:
        nextStatus === OrderStatus.CANCELLED
          ? `${order.orderCode} tidak bisa diproses oleh ${order.restaurant.name}.`
          : `${order.orderCode} sekarang berstatus ${nextStatus.toLowerCase()}.`,
      href: `/orders/${order.orderCode}`,
    },
  });

  return NextResponse.json({ ok: true, order: updatedOrder });
}
