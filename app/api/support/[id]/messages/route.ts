import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import {
  deliverNotifications,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { getSupportSlaState } from "@/lib/support-sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SupportMessagesRouteProps {
  params: Promise<{ id: string }>;
}

const supportMessageSchema = z.object({
  body: z.string().trim().min(2).max(1500),
  attachmentAssetIds: z.array(z.string().min(1)).max(5).optional(),
});

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
  user: {
    select: {
      email: true,
      name: true,
      phone: true,
    },
  },
} as const;

function serializeTicket<T extends { firstResponseDueAt: Date | null; firstRespondedAt: Date | null; resolutionDueAt: Date | null; resolvedAt: Date | null; status: string }>(
  ticket: T,
) {
  return {
    ...ticket,
    slaState: getSupportSlaState(ticket),
  };
}

async function getAuthorizedTicket(ticketId: string, session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      subject: true,
      status: true,
      firstRespondedAt: true,
    },
  });

  if (!ticket) {
    return { ticket: null, response: NextResponse.json({ ok: false, message: "Tiket support tidak ditemukan." }, { status: 404 }) };
  }

  if (session.role !== UserRole.ADMIN && ticket.userId !== session.userId) {
    return { ticket: null, response: NextResponse.json({ ok: false, message: "Tidak boleh mengakses tiket ini." }, { status: 403 }) };
  }

  return { ticket, response: null };
}

async function validateAssets(assetIds: string[], userId: string) {
  if (assetIds.length === 0) {
    return;
  }

  const assets = await prisma.asset.findMany({
    where: {
      id: { in: assetIds },
      uploadedById: userId,
    },
    select: { id: true },
  });

  if (assets.length !== new Set(assetIds).size) {
    throw new Error("Lampiran tidak valid atau bukan milik akun ini.");
  }
}

export async function GET(
  _request: Request,
  { params }: SupportMessagesRouteProps,
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const auth = await getAuthorizedTicket(id, session);

  if (auth.response) {
    return auth.response;
  }

  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id },
    include: ticketInclude,
  });

  return NextResponse.json({ ok: true, ticket: serializeTicket(ticket) });
}

export async function POST(
  request: Request,
  { params }: SupportMessagesRouteProps,
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk membalas support." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const auth = await getAuthorizedTicket(id, session);

  if (auth.response) {
    return auth.response;
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.supportReply,
    session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  if (auth.ticket!.status === "CLOSED") {
    return NextResponse.json(
      { ok: false, message: "Tiket sudah ditutup. Buka tiket baru jika perlu." },
      { status: 400 },
    );
  }

  const parsed = supportMessageSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pesan support tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const attachmentAssetIds = Array.from(
    new Set(parsed.data.attachmentAssetIds ?? []),
  );

  try {
    await validateAssets(attachmentAssetIds, session.userId);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Lampiran tidak valid.",
      },
      { status: 400 },
    );
  }

  const isAdminReply = session.role === UserRole.ADMIN;
  const now = new Date();
  const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const createdMessage = await tx.supportMessage.create({
      data: {
        ticketId: id,
        senderId: session.userId,
        senderRole: session.role,
        body: parsed.data.body.trim(),
      },
    });

    if (attachmentAssetIds.length > 0) {
      await tx.supportAttachment.createMany({
        data: attachmentAssetIds.map((assetId) => ({
          ticketId: id,
          messageId: createdMessage.id,
          assetId,
          label: isAdminReply ? "Lampiran admin" : "Lampiran customer",
        })),
        skipDuplicates: true,
      });

      await tx.asset.updateMany({
        where: { id: { in: attachmentAssetIds } },
        data: {
          entityType: "support_ticket",
          entityId: id,
        },
      });
    }

    const updatedTicket = await tx.supportTicket.update({
      where: { id },
      data: isAdminReply
        ? {
            firstRespondedAt: auth.ticket!.firstRespondedAt ?? now,
            lastAdminMessageAt: now,
            status: auth.ticket!.status === "OPEN" ? "IN_REVIEW" : undefined,
            assignedAdminId: session.userId,
          }
        : {
            lastCustomerMessageAt: now,
            status: auth.ticket!.status === "RESOLVED" ? "IN_REVIEW" : undefined,
          },
      include: ticketInclude,
    });

    const notificationPayloads: NotificationDeliveryPayload[] = [];
    const deliveryPayloads: NotificationDeliveryPayload[] = [];
    const primaryNotification = {
      userId: isAdminReply ? auth.ticket!.userId : session.userId,
      type: NotificationType.SYSTEM,
      title: isAdminReply ? "Support membalas tiket" : "Balasan support dikirim",
      body: isAdminReply
        ? `${auth.ticket!.subject} sudah dibalas admin.`
        : `${auth.ticket!.subject} masuk ke thread support.`,
      href: "/support",
    };
    notificationPayloads.push(primaryNotification);

    if (isAdminReply) {
      deliveryPayloads.push(primaryNotification);
    }

    if (!isAdminReply) {
      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });

      if (admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: "Balasan customer di support",
          body: auth.ticket!.subject,
          href: `/admin/support?ticket=${id}`,
        }));

        notificationPayloads.push(...adminNotifications);
        deliveryPayloads.push(...adminNotifications);
      }
    }

    await tx.notification.createMany({ data: notificationPayloads });

    return { ticket: updatedTicket, deliveryPayloads };
  });

  await deliverNotifications(result.deliveryPayloads);

  return NextResponse.json({ ok: true, ticket: serializeTicket(result.ticket) });
}
