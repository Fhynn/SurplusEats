import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderMessagesRouteProps {
  params: Promise<{ id: string }>;
}

const messageSchema = z.object({
  body: z.string().trim().min(1).max(800),
});

async function findAccessibleOrder(
  orderCode: string,
  session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>,
) {
  return prisma.order.findFirst({
    where: {
      orderCode,
      customerId: session.role === UserRole.CUSTOMER ? session.userId : undefined,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: true,
      restaurant: {
        include: {
          owner: true,
        },
      },
    },
  });
}

function getRecipientUserId(
  order: Awaited<ReturnType<typeof findAccessibleOrder>>,
  senderRole: UserRole,
) {
  if (!order) {
    return null;
  }

  if (senderRole === UserRole.OWNER) {
    return order.customerId;
  }

  if (senderRole === UserRole.CUSTOMER) {
    return order.restaurant.ownerId;
  }

  return order.customerId;
}

function getNotificationTitle(senderRole: UserRole) {
  if (senderRole === UserRole.OWNER) {
    return "Pesan baru dari restoran";
  }

  if (senderRole === UserRole.CUSTOMER) {
    return "Pesan baru dari customer";
  }

  return "Pesan order dari admin";
}

export async function GET(
  _request: Request,
  { params }: OrderMessagesRouteProps,
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk melihat pesan order." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const order = await findAccessibleOrder(id, session);

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const messages = await prisma.orderMessage.findMany({
    where: { orderId: order.id },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, messages });
}

export async function POST(
  request: Request,
  { params }: OrderMessagesRouteProps,
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk mengirim pesan order." },
      { status: 401 },
    );
  }

  const parsed = messageSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pesan order tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const order = await findAccessibleOrder(id, session);

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const recipientUserId = getRecipientUserId(order, session.role);
  const message = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const savedMessage = await tx.orderMessage.create({
      data: {
        orderId: order.id,
        senderId: session.userId,
        senderRole: session.role,
        body: parsed.data.body.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (recipientUserId && recipientUserId !== session.userId) {
      await tx.notification.create({
        data: {
          userId: recipientUserId,
          type: NotificationType.ORDER,
          title: getNotificationTitle(session.role),
          body: `${order.orderCode}: ${savedMessage.body}`,
          href:
            session.role === UserRole.CUSTOMER
              ? `/owner/orders/${order.orderCode}`
              : `/orders/${order.orderCode}`,
        },
      });
    }

    return savedMessage;
  });

  return NextResponse.json({ ok: true, message }, { status: 201 });
}
