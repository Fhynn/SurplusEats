import {
  NotificationType,
  RefundStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";

import {
  createManyNotificationsAndDeliver,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import {
  getRefundPayoutDueAt,
  getRefundReviewDueAt,
  refundPayoutSlaHours,
  refundReviewSlaHours,
} from "@/lib/refund-policy";

type RefundSlaReminderStage =
  | "REVIEW_DUE_SOON"
  | "REVIEW_OVERDUE"
  | "PAYOUT_DUE_SOON"
  | "PAYOUT_OVERDUE";

type RefundForSlaReminder = Awaited<
  ReturnType<typeof loadRefundsNeedingReminder>
>[number];

type RefundSlaReminderPayload = NotificationDeliveryPayload & {
  stage: RefundSlaReminderStage;
  refundId: string;
};

const defaultReminderLeadMinutes = 120;
const defaultDedupeHours = 12;
const defaultRefundScanLimit = 80;

function getPositiveIntEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function subtractMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60 * 1000);
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

async function loadRefundsNeedingReminder({
  now,
  reminderLeadMinutes,
  limit,
}: {
  now: Date;
  reminderLeadMinutes: number;
  limit: number;
}) {
  const reviewReminderCutoff = subtractMinutes(
    now,
    refundReviewSlaHours * 60 - reminderLeadMinutes,
  );
  const payoutReminderCutoff = subtractMinutes(
    now,
    refundPayoutSlaHours * 60 - reminderLeadMinutes,
  );

  return prisma.refundRequest.findMany({
    where: {
      OR: [
        {
          status: { in: [RefundStatus.PENDING, RefundStatus.REVIEWING] },
          createdAt: { lte: reviewReminderCutoff },
        },
        {
          status: RefundStatus.APPROVED,
          reviewedAt: { not: null, lte: payoutReminderCutoff },
        },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          orderCode: true,
          restaurant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

function getRefundReminderStage(
  refund: RefundForSlaReminder,
  now: Date,
): { stage: RefundSlaReminderStage; dueAt: Date } | null {
  if (
    refund.status === RefundStatus.PENDING ||
    refund.status === RefundStatus.REVIEWING
  ) {
    const dueAt = getRefundReviewDueAt(refund.createdAt);

    return {
      stage: now > dueAt ? "REVIEW_OVERDUE" : "REVIEW_DUE_SOON",
      dueAt,
    };
  }

  if (refund.status === RefundStatus.APPROVED && refund.reviewedAt) {
    const dueAt = getRefundPayoutDueAt(refund.reviewedAt);

    if (!dueAt) {
      return null;
    }

    return {
      stage: now > dueAt ? "PAYOUT_OVERDUE" : "PAYOUT_DUE_SOON",
      dueAt,
    };
  }

  return null;
}

function buildAdminReminderPayload({
  adminId,
  refund,
  stage,
  dueAt,
}: {
  adminId: string;
  refund: RefundForSlaReminder;
  stage: RefundSlaReminderStage;
  dueAt: Date;
}): RefundSlaReminderPayload {
  const titleByStage: Record<RefundSlaReminderStage, string> = {
    PAYOUT_DUE_SOON: "Refund disetujui perlu dibayar",
    PAYOUT_OVERDUE: "SLA pembayaran refund terlewat",
    REVIEW_DUE_SOON: "Refund perlu direview sebelum SLA",
    REVIEW_OVERDUE: "SLA review refund terlewat",
  };
  const orderCode = refund.order.orderCode;
  const restaurantName = refund.order.restaurant.name;

  return {
    userId: adminId,
    type: NotificationType.REFUND,
    title: titleByStage[stage],
    body: `${orderCode} dari ${restaurantName} perlu ditindaklanjuti. Batas SLA: ${formatDueTime(dueAt)}.`,
    href: `/admin/refunds/${refund.id}`,
    stage,
    refundId: refund.id,
  };
}

function buildCustomerOverduePayload({
  refund,
  stage,
}: {
  refund: RefundForSlaReminder;
  stage: RefundSlaReminderStage;
}): RefundSlaReminderPayload | null {
  if (stage !== "REVIEW_OVERDUE" && stage !== "PAYOUT_OVERDUE") {
    return null;
  }

  const orderCode = refund.order.orderCode;

  return {
    userId: refund.customerId,
    type: NotificationType.REFUND,
    title:
      stage === "REVIEW_OVERDUE"
        ? "Review refund masih diproses"
        : "Pembayaran refund masih diproses",
    body:
      stage === "REVIEW_OVERDUE"
        ? `Refund ${orderCode} melewati estimasi review. Admin sudah mendapat reminder otomatis.`
        : `Refund ${orderCode} melewati estimasi pembayaran. Admin sudah mendapat reminder otomatis.`,
    href: `/orders/${orderCode}/refund`,
    stage,
    refundId: refund.id,
  };
}

function buildDedupeKey(
  payload: Pick<NotificationDeliveryPayload, "href" | "title" | "userId">,
) {
  return `${payload.userId}:${payload.href ?? ""}:${payload.title}`;
}

async function filterUndeliveredPayloads(
  payloads: RefundSlaReminderPayload[],
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

function countByStage(payloads: RefundSlaReminderPayload[]) {
  return payloads.reduce(
    (counts, payload) => ({
      ...counts,
      [payload.stage]: (counts[payload.stage] ?? 0) + 1,
    }),
    {} as Record<RefundSlaReminderStage, number>,
  );
}

function toNotificationDeliveryPayload(
  payload: RefundSlaReminderPayload,
): NotificationDeliveryPayload {
  return {
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    href: payload.href,
  };
}

export async function sendRefundSlaReminders(now = new Date()) {
  const reminderLeadMinutes = getPositiveIntEnv(
    "REFUND_SLA_REMINDER_LEAD_MINUTES",
    defaultReminderLeadMinutes,
  );
  const dedupeHours = getPositiveIntEnv(
    "REFUND_SLA_REMINDER_DEDUPE_HOURS",
    defaultDedupeHours,
  );
  const limit = getPositiveIntEnv("REFUND_SLA_REMINDER_SCAN_LIMIT", defaultRefundScanLimit);
  const [refunds, admins] = await Promise.all([
    loadRefundsNeedingReminder({ now, reminderLeadMinutes, limit }),
    prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
  ]);
  const candidatePayloads = refunds.flatMap((refund) => {
    const stageState = getRefundReminderStage(refund, now);

    if (!stageState) {
      return [];
    }

    const adminPayloads = admins.map((admin) =>
      buildAdminReminderPayload({
        adminId: admin.id,
        refund,
        stage: stageState.stage,
        dueAt: stageState.dueAt,
      }),
    );
    const customerPayload = buildCustomerOverduePayload({
      refund,
      stage: stageState.stage,
    });

    return customerPayload ? [...adminPayloads, customerPayload] : adminPayloads;
  });
  const payloads = await filterUndeliveredPayloads(
    candidatePayloads,
    subtractHours(now, dedupeHours),
  );
  const deliveryPayloads = payloads.map(toNotificationDeliveryPayload);

  await createManyNotificationsAndDeliver(deliveryPayloads);

  await prisma.adminActionLog.create({
    data: {
      action: "REFUND_SLA_REMINDER_CRON",
      targetType: "refund_sla",
      metadata: {
        scannedRefundCount: refunds.length,
        adminCount: admins.length,
        candidateNotificationCount: candidatePayloads.length,
        sentNotificationCount: payloads.length,
        reminderLeadMinutes,
        dedupeHours,
        stageCounts: countByStage(payloads),
      },
    },
  });

  return {
    scannedRefundCount: refunds.length,
    adminCount: admins.length,
    candidateNotificationCount: candidatePayloads.length,
    sentNotificationCount: payloads.length,
    reminderLeadMinutes,
    dedupeHours,
    stageCounts: countByStage(payloads),
    processedAt: now,
  };
}
