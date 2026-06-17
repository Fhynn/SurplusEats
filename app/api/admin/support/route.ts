import { NotificationType, UserRole, UserStatus } from "@prisma/client";
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
import {
  getSupportSlaDates,
  getSupportSlaState,
  normalizeSupportPriority,
} from "@/lib/support-sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateTicketSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedAdminId: z.string().min(1).nullable().optional(),
  adminNote: z.string().trim().max(1200).optional(),
});

const ticketInclude = {
  assignee: {
    select: { id: true, email: true, name: true },
  },
  attachments: {
    include: { asset: true },
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
      total: true,
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

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const [tickets, admins] = await Promise.all([
    prisma.supportTicket.findMany({
      include: ticketInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true },
    }),
  ]);
  const ticketsWithSla = tickets.map(serializeTicket);
  const metrics = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "OPEN").length,
    inReview: tickets.filter((ticket) => ticket.status === "IN_REVIEW").length,
    resolved: tickets.filter((ticket) => ticket.status === "RESOLVED").length,
    urgent: tickets.filter((ticket) => ticket.priority === "URGENT").length,
    overdue: ticketsWithSla.filter((ticket) =>
      String(ticket.slaState).includes("OVERDUE"),
    ).length,
    unassigned: tickets.filter((ticket) => !ticket.assignedAdminId).length,
  };

  return NextResponse.json({
    ok: true,
    tickets: ticketsWithSla,
    admins,
    metrics,
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminSupportMutation,
    session,
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = updateTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data tiket tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      subject: true,
      userId: true,
      status: true,
      priority: true,
      assignedAdminId: true,
      firstRespondedAt: true,
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { ok: false, message: "Tiket support tidak ditemukan." },
      { status: 404 },
    );
  }

  if (parsed.data.assignedAdminId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: parsed.data.assignedAdminId,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json(
        { ok: false, message: "Admin assignee tidak valid." },
        { status: 400 },
      );
    }
  }

  const nextPriority = parsed.data.priority
    ? normalizeSupportPriority(parsed.data.priority)
    : normalizeSupportPriority(ticket.priority);
  const shouldResetSla =
    parsed.data.priority && parsed.data.priority !== ticket.priority;
  const nextStatus = parsed.data.status ?? ticket.status;
  const isDone = nextStatus === "RESOLVED" || nextStatus === "CLOSED";
  const now = new Date();
  const sla = shouldResetSla ? getSupportSlaDates(nextPriority, now) : null;

  const result = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          priority: nextPriority,
          assignedAdminId:
            parsed.data.assignedAdminId === undefined
              ? ticket.assignedAdminId
              : parsed.data.assignedAdminId,
          adminNote: parsed.data.adminNote || null,
          firstRespondedAt:
            ticket.firstRespondedAt ??
            (parsed.data.adminNote || nextStatus !== "OPEN" ? now : undefined),
          firstResponseDueAt: sla?.firstResponseDueAt,
          resolutionDueAt: sla?.resolutionDueAt,
          resolvedAt: isDone ? now : null,
          closedAt: nextStatus === "CLOSED" ? now : null,
        },
        include: ticketInclude,
      });

      const notificationPayloads: NotificationDeliveryPayload[] = [
        {
          userId: ticket.userId,
          type: NotificationType.SYSTEM,
          title:
            nextStatus === "RESOLVED"
              ? "Tiket support selesai"
              : "Status tiket support diperbarui",
          body:
            parsed.data.adminNote ||
            `${ticket.subject} sekarang berstatus ${nextStatus}.`,
          href: "/support",
        },
      ];

      if (
        parsed.data.assignedAdminId &&
        parsed.data.assignedAdminId !== ticket.assignedAdminId
      ) {
        notificationPayloads.push({
          userId: parsed.data.assignedAdminId,
          type: NotificationType.SYSTEM,
          title: "Tiket support ditugaskan",
          body: ticket.subject,
          href: `/admin/support?ticket=${ticket.id}`,
        });
      }

      await tx.notification.createMany({ data: notificationPayloads });

      await tx.adminActionLog.create({
        data: {
          adminId: session.userId,
          action: `SUPPORT_${nextStatus}`,
          targetType: "support_ticket",
          targetId: ticket.id,
          metadata: {
            adminNote: parsed.data.adminNote,
            assignedAdminId: parsed.data.assignedAdminId,
            priority: nextPriority,
          },
        },
      });

      return { ticket: updated, notificationPayloads };
    },
  );

  await deliverNotifications(result.notificationPayloads);

  return NextResponse.json({
    ok: true,
    ticket: serializeTicket(result.ticket),
  });
}
