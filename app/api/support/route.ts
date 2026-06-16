import { NotificationType, UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  getSupportPriorityForCategory,
  getSupportSlaDates,
  getSupportSlaState,
  normalizeSupportPriority,
} from "@/lib/support-sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportTicketSchema = z.object({
  category: z.enum(["ORDER", "REFUND", "PAYMENT", "ACCOUNT", "OTHER"]),
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(12).max(1500),
  orderCode: z.string().trim().min(3).max(40).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  attachmentAssetIds: z.array(z.string().min(1)).max(5).optional(),
});

const categoryLabel: Record<z.infer<typeof supportTicketSchema>["category"], string> = {
  ACCOUNT: "Akun",
  ORDER: "Pesanan",
  OTHER: "Lainnya",
  PAYMENT: "Pembayaran",
  REFUND: "Refund",
};

const ticketInclude = {
  assignee: {
    select: { id: true, email: true, name: true },
  },
  attachments: {
    include: {
      asset: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  messages: {
    include: {
      attachments: {
        include: { asset: true },
        orderBy: { createdAt: "asc" as const },
      },
      sender: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
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
} as const;

async function chooseAssignedAdminId() {
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    select: { id: true },
  });

  if (admins.length === 0) {
    return null;
  }

  const workloads = await Promise.all(
    admins.map(async (admin) => ({
      adminId: admin.id,
      openTickets: await prisma.supportTicket.count({
        where: {
          assignedAdminId: admin.id,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
      }),
    })),
  );

  return workloads.sort((a, b) => a.openTickets - b.openTickets)[0].adminId;
}

async function getOwnedAssets(assetIds: string[], userId: string) {
  if (assetIds.length === 0) {
    return [];
  }

  const assets = await prisma.asset.findMany({
    where: {
      id: { in: assetIds },
      uploadedById: userId,
    },
    select: { id: true },
  });

  if (assets.length !== new Set(assetIds).size) {
    throw new Error("Lampiran support tidak valid atau bukan milik akun ini.");
  }

  return assets;
}

function serializeTicket<T extends { firstResponseDueAt: Date | null; firstRespondedAt: Date | null; resolutionDueAt: Date | null; resolvedAt: Date | null; status: string }>(
  ticket: T,
) {
  return {
    ...ticket,
    slaState: getSupportSlaState(ticket),
  };
}

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
    include: ticketInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    tickets: tickets.map(serializeTicket),
  });
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

  const attachmentAssetIds = Array.from(
    new Set(parsed.data.attachmentAssetIds ?? []),
  );

  try {
    await getOwnedAssets(attachmentAssetIds, session.userId);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Lampiran support tidak valid.",
      },
      { status: 400 },
    );
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    select: { id: true },
  });
  const assignedAdminId = await chooseAssignedAdminId();
  const now = new Date();
  const priority = normalizeSupportPriority(
    parsed.data.priority ?? getSupportPriorityForCategory(parsed.data.category),
  );
  const sla = getSupportSlaDates(priority, now);

  const ticket = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const createdTicket = await tx.supportTicket.create({
      data: {
        userId: session.userId,
        orderId: order?.id,
        orderCode: order?.orderCode ?? orderCode,
        assignedAdminId,
        category: parsed.data.category,
        subject: parsed.data.subject.trim(),
        message: parsed.data.message.trim(),
        priority,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        lastCustomerMessageAt: now,
      },
    });

    const initialMessage = await tx.supportMessage.create({
      data: {
        ticketId: createdTicket.id,
        senderId: session.userId,
        senderRole: UserRole.CUSTOMER,
        body: parsed.data.message.trim(),
      },
    });

    if (attachmentAssetIds.length > 0) {
      await tx.supportAttachment.createMany({
        data: attachmentAssetIds.map((assetId) => ({
          ticketId: createdTicket.id,
          messageId: initialMessage.id,
          assetId,
          label: "Lampiran customer",
        })),
        skipDuplicates: true,
      });

      await tx.asset.updateMany({
        where: { id: { in: attachmentAssetIds } },
        data: {
          entityType: "support_ticket",
          entityId: createdTicket.id,
        },
      });
    }

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
          title: assignedAdminId === admin.id ? "Tiket support ditugaskan" : "Tiket support baru",
          body: `${categoryLabel[parsed.data.category]} - ${createdTicket.subject}`,
          href: `/admin/support?ticket=${createdTicket.id}`,
        })),
      });
    }

    return tx.supportTicket.findUniqueOrThrow({
      where: { id: createdTicket.id },
      include: ticketInclude,
    });
  });

  return NextResponse.json(
    { ok: true, ticket: serializeTicket(ticket) },
    { status: 201 },
  );
}
