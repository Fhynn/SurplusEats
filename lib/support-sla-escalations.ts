import { NotificationType, UserRole, UserStatus } from "@prisma/client";

import {
  createManyNotificationsAndDeliver,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import {
  normalizeSupportPriority,
  supportPriorityLabel,
  type SupportPriority,
} from "@/lib/support-sla";

type SupportSlaEscalationStage =
  | "FIRST_RESPONSE_OVERDUE"
  | "RESOLUTION_OVERDUE";

type SupportTicketForEscalation = Awaited<
  ReturnType<typeof loadTicketsNeedingEscalation>
>[number];

type AdminWithWorkload = {
  id: string;
  openTickets: number;
};

type SupportEscalationPayload = NotificationDeliveryPayload & {
  stage: SupportSlaEscalationStage;
  ticketId: string;
};

const defaultDedupeHours = 8;
const defaultScanLimit = 80;
const priorityRank: Record<SupportPriority, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

function getPositiveIntEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function formatDueTime(dueAt: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(dueAt);
}

function buildDedupeKey(
  payload: Pick<NotificationDeliveryPayload, "href" | "title" | "userId">,
) {
  return `${payload.userId}:${payload.href ?? ""}:${payload.title}`;
}

function getEscalationStage(
  ticket: Pick<
    SupportTicketForEscalation,
    "firstRespondedAt" | "firstResponseDueAt" | "resolutionDueAt"
  >,
  now: Date,
): { stage: SupportSlaEscalationStage; dueAt: Date } | null {
  if (ticket.resolutionDueAt && ticket.resolutionDueAt.getTime() <= now.getTime()) {
    return {
      stage: "RESOLUTION_OVERDUE",
      dueAt: ticket.resolutionDueAt,
    };
  }

  if (
    !ticket.firstRespondedAt &&
    ticket.firstResponseDueAt &&
    ticket.firstResponseDueAt.getTime() <= now.getTime()
  ) {
    return {
      stage: "FIRST_RESPONSE_OVERDUE",
      dueAt: ticket.firstResponseDueAt,
    };
  }

  return null;
}

function getEscalatedPriority(
  currentPriority: string,
  stage: SupportSlaEscalationStage,
) {
  const current = normalizeSupportPriority(currentPriority);
  const target: SupportPriority =
    stage === "RESOLUTION_OVERDUE" ? "URGENT" : "HIGH";

  return priorityRank[current] >= priorityRank[target] ? current : target;
}

async function loadTicketsNeedingEscalation(now: Date, limit: number) {
  return prisma.supportTicket.findMany({
    where: {
      status: { in: ["OPEN", "IN_REVIEW"] },
      OR: [
        {
          firstRespondedAt: null,
          firstResponseDueAt: { not: null, lte: now },
        },
        {
          resolutionDueAt: { not: null, lte: now },
        },
      ],
    },
    include: {
      assignee: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: "desc" },
      { firstResponseDueAt: "asc" },
      { resolutionDueAt: "asc" },
      { createdAt: "asc" },
    ],
    take: limit,
  });
}

async function loadAdminsWithWorkload(): Promise<AdminWithWorkload[]> {
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  return Promise.all(
    admins.map(async (admin) => ({
      id: admin.id,
      openTickets: await prisma.supportTicket.count({
        where: {
          assignedAdminId: admin.id,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
      }),
    })),
  );
}

function chooseLeastLoadedAdmin(admins: AdminWithWorkload[]) {
  return [...admins].sort((left, right) => left.openTickets - right.openTickets)[0]
    ?.id;
}

function getAdminRecipientIds({
  stage,
  admins,
  assignedAdminId,
}: {
  stage: SupportSlaEscalationStage;
  admins: AdminWithWorkload[];
  assignedAdminId: string | null;
}) {
  if (stage === "RESOLUTION_OVERDUE") {
    return admins.map((admin) => admin.id);
  }

  return assignedAdminId ? [assignedAdminId] : admins.map((admin) => admin.id);
}

function buildAdminPayload({
  adminId,
  ticket,
  stage,
  dueAt,
}: {
  adminId: string;
  ticket: SupportTicketForEscalation;
  stage: SupportSlaEscalationStage;
  dueAt: Date;
}): SupportEscalationPayload {
  const title =
    stage === "RESOLUTION_OVERDUE"
      ? "SLA resolusi support terlewat"
      : "SLA respon support terlewat";
  const priority = normalizeSupportPriority(ticket.priority);

  return {
    userId: adminId,
    type: NotificationType.SYSTEM,
    title,
    body: `${ticket.subject} milik ${ticket.user.name} butuh tindak lanjut. Prioritas: ${supportPriorityLabel[priority]}. Batas SLA: ${formatDueTime(dueAt)}.`,
    href: `/admin/support?ticket=${ticket.id}`,
    stage,
    ticketId: ticket.id,
  };
}

function buildCustomerPayload({
  ticket,
  stage,
}: {
  ticket: SupportTicketForEscalation;
  stage: SupportSlaEscalationStage;
}): SupportEscalationPayload | null {
  if (stage !== "RESOLUTION_OVERDUE") {
    return null;
  }

  return {
    userId: ticket.userId,
    type: NotificationType.SYSTEM,
    title: "Support masih ditangani",
    body: `Tiket "${ticket.subject}" melewati estimasi penyelesaian. Admin sudah mendapat eskalasi otomatis.`,
    href: "/support",
    stage,
    ticketId: ticket.id,
  };
}

async function filterUndeliveredPayloads(
  payloads: SupportEscalationPayload[],
  since: Date,
) {
  if (payloads.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(payloads.map((payload) => payload.userId)));
  const titles = Array.from(new Set(payloads.map((payload) => payload.title)));
  const hrefs = Array.from(
    new Set(payloads.map((payload) => payload.href).filter(Boolean)),
  ) as string[];
  const recentNotifications = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      title: { in: titles },
      href: { in: hrefs },
      createdAt: { gte: since },
    },
    select: {
      userId: true,
      title: true,
      href: true,
    },
  });
  const existingKeys = new Set(recentNotifications.map(buildDedupeKey));

  return payloads.filter((payload) => !existingKeys.has(buildDedupeKey(payload)));
}

function countByStage(payloads: SupportEscalationPayload[]) {
  return payloads.reduce(
    (counts, payload) => ({
      ...counts,
      [payload.stage]: (counts[payload.stage] ?? 0) + 1,
    }),
    {} as Record<SupportSlaEscalationStage, number>,
  );
}

function toNotificationDeliveryPayload(
  payload: SupportEscalationPayload,
): NotificationDeliveryPayload {
  return {
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    href: payload.href,
  };
}

export async function runSupportSlaEscalations(now = new Date()) {
  const dedupeHours = getPositiveIntEnv(
    "SUPPORT_SLA_ESCALATION_DEDUPE_HOURS",
    defaultDedupeHours,
  );
  const limit = getPositiveIntEnv(
    "SUPPORT_SLA_ESCALATION_SCAN_LIMIT",
    defaultScanLimit,
  );
  const [tickets, admins] = await Promise.all([
    loadTicketsNeedingEscalation(now, limit),
    loadAdminsWithWorkload(),
  ]);
  let updatedTicketCount = 0;
  let assignedTicketCount = 0;
  const candidatePayloads: SupportEscalationPayload[] = [];

  for (const ticket of tickets) {
    const stageState = getEscalationStage(ticket, now);

    if (!stageState) {
      continue;
    }

    const nextPriority = getEscalatedPriority(ticket.priority, stageState.stage);
    const assignedAdminId =
      ticket.assignedAdminId ?? chooseLeastLoadedAdmin(admins) ?? null;
    const updateData: {
      priority?: SupportPriority;
      assignedAdminId?: string;
    } = {};

    if (nextPriority !== ticket.priority) {
      updateData.priority = nextPriority;
    }

    if (!ticket.assignedAdminId && assignedAdminId) {
      updateData.assignedAdminId = assignedAdminId;
    }

    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.supportTicket.updateMany({
        where: {
          id: ticket.id,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
        data: updateData,
      });

      if (updated.count === 1) {
        updatedTicketCount += 1;
        assignedTicketCount += updateData.assignedAdminId ? 1 : 0;

        await prisma.adminActionLog.create({
          data: {
            action: "SUPPORT_SLA_ESCALATED",
            targetType: "support_ticket",
            targetId: ticket.id,
            metadata: {
              stage: stageState.stage,
              previousPriority: ticket.priority,
              nextPriority,
              previousAssignedAdminId: ticket.assignedAdminId,
              nextAssignedAdminId: assignedAdminId,
              dueAt: stageState.dueAt.toISOString(),
            },
          },
        });
      }
    }

    const adminRecipientIds = getAdminRecipientIds({
      stage: stageState.stage,
      admins,
      assignedAdminId,
    });

    candidatePayloads.push(
      ...adminRecipientIds.map((adminId) =>
        buildAdminPayload({
          adminId,
          ticket: {
            ...ticket,
            assignedAdminId,
            priority: nextPriority,
          },
          stage: stageState.stage,
          dueAt: stageState.dueAt,
        }),
      ),
    );

    const customerPayload = buildCustomerPayload({
      ticket,
      stage: stageState.stage,
    });

    if (customerPayload) {
      candidatePayloads.push(customerPayload);
    }
  }

  const payloads = await filterUndeliveredPayloads(
    candidatePayloads,
    subtractHours(now, dedupeHours),
  );
  const deliveryPayloads = payloads.map(toNotificationDeliveryPayload);

  await createManyNotificationsAndDeliver(deliveryPayloads);

  await prisma.adminActionLog.create({
    data: {
      action: "SUPPORT_SLA_ESCALATION_CRON",
      targetType: "support_sla",
      metadata: {
        scannedTicketCount: tickets.length,
        adminCount: admins.length,
        candidateNotificationCount: candidatePayloads.length,
        sentNotificationCount: payloads.length,
        updatedTicketCount,
        assignedTicketCount,
        dedupeHours,
        stageCounts: countByStage(payloads),
      },
    },
  });

  return {
    scannedTicketCount: tickets.length,
    adminCount: admins.length,
    candidateNotificationCount: candidatePayloads.length,
    sentNotificationCount: payloads.length,
    updatedTicketCount,
    assignedTicketCount,
    dedupeHours,
    stageCounts: countByStage(payloads),
    processedAt: now,
  };
}
