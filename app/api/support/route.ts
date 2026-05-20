import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportTicketSchema = z.object({
  category: z.enum(["ORDER", "REFUND", "PAYMENT", "ACCOUNT", "OTHER"]),
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(12).max(1500),
  orderCode: z.string().trim().min(3).max(40).optional(),
});

const categoryLabel: Record<z.infer<typeof supportTicketSchema>["category"], string> = {
  ACCOUNT: "Akun",
  ORDER: "Pesanan",
  OTHER: "Lainnya",
  PAYMENT: "Pembayaran",
  REFUND: "Refund",
};

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk melihat support." },
      { status: session ? 403 : 401 },
    );
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.userId },
    include: {
      order: {
        select: {
          orderCode: true,
          status: true,
          restaurant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, tickets });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk membuat tiket." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = supportTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data support tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const orderCode = parsed.data.orderCode?.trim().toUpperCase();
  const order = orderCode
    ? await prisma.order.findFirst({
        where: {
          orderCode,
          customerId: session.userId,
        },
        select: {
          id: true,
          orderCode: true,
          restaurant: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
      })
    : null;

  if (orderCode && !order) {
    return NextResponse.json(
      {
        ok: false,
        message: "Order ID tidak ditemukan di akun customer ini.",
      },
      { status: 404 },
    );
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });

  const ticket = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const createdTicket = await tx.supportTicket.create({
      data: {
        userId: session.userId,
        orderId: order?.id,
        orderCode: order?.orderCode ?? orderCode,
        category: parsed.data.category,
        subject: parsed.data.subject.trim(),
        message: parsed.data.message.trim(),
      },
      include: {
        order: {
          select: {
            orderCode: true,
            status: true,
            restaurant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: session.userId,
        type: NotificationType.SYSTEM,
        title: "Tiket support dibuat",
        body: `${createdTicket.subject} sedang menunggu review admin.`,
        href: "/support",
      },
    });

    if (order?.restaurant.ownerId) {
      await tx.notification.create({
        data: {
          userId: order.restaurant.ownerId,
          type: NotificationType.SYSTEM,
          title: "Support terkait order",
          body: `Customer membuat tiket untuk ${order.orderCode} di ${order.restaurant.name}.`,
          href: `/owner/orders/${order.orderCode}`,
        },
      });
    }

    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: "Tiket support baru",
          body: `${categoryLabel[parsed.data.category]} - ${createdTicket.subject}`,
          href: `/admin/support?ticket=${createdTicket.id}`,
        })),
      });
    }

    return createdTicket;
  });

  return NextResponse.json({ ok: true, ticket }, { status: 201 });
}
