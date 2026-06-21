import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  requireAdminPermission,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminUserRouteProps {
  params: Promise<{ id: string }>;
}

type ActivityTone = "emerald" | "blue" | "amber" | "red" | "gray";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  tone: ActivityTone;
};

const updateUserSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]),
});

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function getOrderTone(status: string): ActivityTone {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return "red";
  }

  if (status === "NO_SHOW") {
    return "amber";
  }

  if (status === "COMPLETED") {
    return "emerald";
  }

  return "blue";
}

async function requireAdmin(permission: AdminPermission = "USERS_VIEW") {
  return requireAdminPermission(permission);
}

export async function GET(_request: Request, { params }: AdminUserRouteProps) {
  const adminCheck = await requireAdmin();

  if (adminCheck.response) {
    return adminCheck.response;
  }

  const { id } = await params;
  const [user, adminLogs, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
        applications: { orderBy: { submittedAt: "desc" } },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            restaurant: true,
            items: true,
            refundRequest: true,
            review: true,
          },
        },
        ownedRestaurants: {
          include: {
            menuItems: true,
            orders: { include: { refundRequest: true } },
            reviews: true,
          },
        },
        refunds: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { restaurant: true },
        },
        supportTickets: {
          orderBy: { updatedAt: "desc" },
          take: 8,
        },
      },
    }),
    prisma.adminActionLog.findMany({
      where: { targetType: "user", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { lastSeenAt: "desc" },
      take: 12,
      include: {
        impersonatedBy: { select: { id: true, name: true, email: true } },
        revokedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  if (!user || user.role === UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan." },
      { status: 404 },
    );
  }

  const ownedOrders = user.ownedRestaurants.flatMap(
    (restaurant) => restaurant.orders,
  );
  const restaurantNameByOrderId = new Map(
    user.ownedRestaurants.flatMap((restaurant) =>
      restaurant.orders.map((order) => [order.id, restaurant.name] as const),
    ),
  );
  const relevantOrders = user.role === UserRole.OWNER ? ownedOrders : user.orders;
  const totalSpent =
    user.role === UserRole.OWNER
      ? ownedOrders.reduce((total, order) => total + order.total, 0)
      : user.orders.reduce((total, order) => total + order.total, 0);
  const refundRequests =
    user.role === UserRole.OWNER
      ? ownedOrders.filter((order) => order.refundRequest).length
      : user.refunds.length;
  const completedOrders = relevantOrders.filter(
    (order) => order.status === "COMPLETED",
  ).length;
  const pickupRate =
    relevantOrders.length > 0
      ? Math.round((completedOrders / relevantOrders.length) * 100)
      : 0;
  const latestApplication = user.applications[0];
  const primaryAddress = user.addresses[0];
  const linkedStore = user.ownedRestaurants[0];
  const latestSession = sessions[0];

  const orderActivities: ActivityItem[] =
    user.role === UserRole.OWNER
      ? ownedOrders.slice(0, 8).map((order) => ({
          id: `order-${order.id}`,
          title: `Order ${order.orderCode}`,
          description: `${order.status} - ${formatRp(order.total)} - ${
            restaurantNameByOrderId.get(order.id) ?? "Restoran"
          }`,
          createdAt: order.updatedAt,
          tone: getOrderTone(order.status),
        }))
      : user.orders.slice(0, 8).map((order) => ({
          id: `order-${order.id}`,
          title: `Order ${order.orderCode}`,
          description: `${order.status} - ${formatRp(order.total)} - ${
            order.restaurant.name
          }`,
          createdAt: order.updatedAt,
          tone: getOrderTone(order.status),
        }));

  const refundActivities: ActivityItem[] =
    user.role === UserRole.OWNER
      ? ownedOrders
          .filter((order) => order.refundRequest)
          .slice(0, 6)
          .map((order) => ({
            id: `refund-${order.refundRequest!.id}`,
            title: `Refund ${order.orderCode}`,
            description: `${order.refundRequest!.status} - ${formatRp(order.refundRequest!.amount)}`,
            createdAt: order.refundRequest!.updatedAt,
            tone:
              order.refundRequest!.status === "REJECTED"
                ? "red"
                : order.refundRequest!.status === "PAID"
                  ? "emerald"
                  : "amber",
          }))
      : user.refunds.slice(0, 6).map((refund) => ({
          id: `refund-${refund.id}`,
          title: "Pengajuan refund",
          description: `${refund.status} - ${formatRp(refund.amount)} - ${refund.reason}`,
          createdAt: refund.updatedAt,
          tone:
            refund.status === "REJECTED"
              ? "red"
              : refund.status === "PAID"
                ? "emerald"
                : "amber",
        }));

  const supportActivities: ActivityItem[] = user.supportTickets.map((ticket) => ({
    id: `support-${ticket.id}`,
    title: `Support ${ticket.status}`,
    description: `${ticket.category} - ${ticket.subject}`,
    createdAt: ticket.updatedAt,
    tone: ticket.status === "RESOLVED" ? "emerald" : "blue",
  }));

  const reviewActivities: ActivityItem[] = user.reviews.map((review) => ({
    id: `review-${review.id}`,
    title: `Review ${review.rating}/5`,
    description: `${review.restaurant.name}${review.comment ? ` - ${review.comment}` : ""}`,
    createdAt: review.createdAt,
    tone: review.rating >= 4 ? "emerald" : review.rating <= 2 ? "red" : "amber",
  }));

  const adminActivities: ActivityItem[] = adminLogs.map((log) => ({
    id: `admin-${log.id}`,
    title: log.action.replaceAll("_", " "),
    description: `Admin: ${log.admin?.name ?? "System"}${log.admin?.email ? ` - ${log.admin.email}` : ""}`,
    createdAt: log.createdAt,
    tone: log.action.includes("SUSPENDED") ? "red" : "gray",
  }));

  const sessionActivities: ActivityItem[] = sessions.slice(0, 6).map((item) => ({
    id: `session-${item.id}`,
    title:
      item.kind === "IMPERSONATION"
        ? "Admin impersonation"
        : item.revokedAt
          ? "Session dicabut"
          : "Session aktif",
    description: `${item.deviceLabel ?? "Perangkat"}${item.ipAddress ? ` - ${item.ipAddress}` : ""}`,
    createdAt: item.revokedAt ?? item.lastSeenAt,
    tone:
      item.kind === "IMPERSONATION"
        ? "amber"
        : item.revokedAt
          ? "red"
          : "emerald",
  }));

  const activities = [
    ...orderActivities,
    ...refundActivities,
    ...supportActivities,
    ...reviewActivities,
    ...adminActivities,
    ...sessionActivities,
  ]
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 18)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      time: formatDateTime(activity.createdAt),
      tone: activity.tone,
    }));

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      joinedAt: formatDateTime(user.createdAt),
      name: user.name,
      email: user.email,
      phone: user.phone || "-",
      city: primaryAddress?.city || linkedStore?.city || "-",
      role: user.role === UserRole.OWNER ? "owner" : "customer",
      status: user.status === UserStatus.SUSPENDED ? "banned" : "active",
      banReason:
        user.status === UserStatus.SUSPENDED
          ? "Akun sedang dibekukan oleh admin."
          : undefined,
      lastLogin: latestSession ? formatDateTime(latestSession.lastSeenAt) : "-",
      verification:
        user.role === UserRole.OWNER
          ? latestApplication?.status || "Belum ada aplikasi"
          : user.emailVerified
            ? "Email terverifikasi"
            : "Email belum terverifikasi",
      accountHealth:
        user.status === UserStatus.SUSPENDED ? "Dibekukan" : "Aktif",
      totalOrders: relevantOrders.length,
      totalSpent,
      totalSpentLabel: formatRp(totalSpent),
      refundRequests,
      pickupRate,
      riskScore: Math.min(100, refundRequests * 15),
      linkedStore: linkedStore?.name,
    },
    activities,
    sessions: sessions.map((item) => ({
      id: item.id,
      kind: item.kind,
      deviceLabel: item.deviceLabel ?? "Perangkat tidak dikenal",
      ipAddress: item.ipAddress ?? "-",
      userAgent: item.userAgent ?? "-",
      startedAt: formatDateTime(item.startedAt),
      lastSeenAt: formatDateTime(item.lastSeenAt),
      expiresAt: formatDateTime(item.expiresAt),
      revokedAt: item.revokedAt ? formatDateTime(item.revokedAt) : null,
      revokeReason: item.revokeReason,
      impersonatedBy: item.impersonatedBy
        ? {
            id: item.impersonatedBy.id,
            name: item.impersonatedBy.name,
            email: item.impersonatedBy.email,
          }
        : null,
      revokedBy: item.revokedBy
        ? {
            id: item.revokedBy.id,
            name: item.revokedBy.name,
            email: item.revokedBy.email,
          }
        : null,
    })),
  });
}

export async function PATCH(request: Request, { params }: AdminUserRouteProps) {
  const adminCheck = await requireAdmin("USERS_MANAGE_STATUS");

  if (adminCheck.response) {
    return adminCheck.response;
  }

  const { id } = await params;
  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminUserMutation,
    adminCheck.session,
    [id],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = updateUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Status user tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existingUser || existingUser.role === UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan." },
      { status: 404 },
    );
  }

  const user = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const updatedUser = await tx.user.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    if (parsed.data.status === UserStatus.SUSPENDED) {
      await tx.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedById: adminCheck.session!.userId,
          revokeReason: "ACCOUNT_SUSPENDED",
        },
      });
    }

    await tx.adminActionLog.create({
      data: {
        adminId: adminCheck.session!.userId,
        action: `USER_${parsed.data.status}`,
        targetType: "user",
        targetId: updatedUser.id,
      },
    });

    return updatedUser;
  });

  return NextResponse.json({ ok: true, user });
}
