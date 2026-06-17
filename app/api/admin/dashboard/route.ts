import {
  ApplicationStatus,
  OrderStatus,
  RefundStatus,
  RestaurantStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { buildAdminDashboardReportPdf } from "@/lib/admin-dashboard-report-pdf";
import { prisma } from "@/lib/prisma";
import { getCachedJson } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function requireAdmin(session: Awaited<ReturnType<typeof getCurrentSession>>) {
  return session?.role === UserRole.ADMIN;
}

const csvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text =
    typeof value === "string" ? value : JSON.stringify(value).replace(/\n/g, " ");

  return `"${text.replace(/"/g, '""')}"`;
};

const makeCsv = (headers: string[], rows: unknown[][]) =>
  [headers.map(csvValue).join(","), ...rows.map((row) => row.map(csvValue).join(","))]
    .join("\n")
    .concat("\n");

const getDateRange = (url: URL) => {
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
  };
};

const getDateWhere = (from: Date | null, to: Date | null) => {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
};

const textContains = (query: string) => ({
  contains: query,
  mode: "insensitive" as const,
});

const userRoleParam: Record<string, UserRole> = {
  customer: UserRole.CUSTOMER,
  owner: UserRole.OWNER,
};

const userStatusParam: Record<string, UserStatus> = {
  active: UserStatus.ACTIVE,
  banned: UserStatus.SUSPENDED,
};

const applicationStatusParam: Record<string, ApplicationStatus> = {
  pending: ApplicationStatus.PENDING,
  approved: ApplicationStatus.APPROVED,
  rejected: ApplicationStatus.REJECTED,
};

const orderStatusParam: Record<string, OrderStatus> = {
  pending: OrderStatus.PENDING,
  payment_failed: OrderStatus.PAYMENT_FAILED,
  paid: OrderStatus.PAID,
  confirmed: OrderStatus.CONFIRMED,
  preparing: OrderStatus.PREPARING,
  ready: OrderStatus.READY,
  completed: OrderStatus.COMPLETED,
  no_show: OrderStatus.NO_SHOW,
  cancelled: OrderStatus.CANCELLED,
  refunded: OrderStatus.REFUNDED,
};

const refundStatusParam: Record<string, RefundStatus> = {
  pending: RefundStatus.PENDING,
  reviewing: RefundStatus.REVIEWING,
  approved: RefundStatus.APPROVED,
  rejected: RefundStatus.REJECTED,
  paid: RefundStatus.PAID,
};

const applicationLabel: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: "Menunggu",
  [ApplicationStatus.APPROVED]: "Disetujui",
  [ApplicationStatus.REJECTED]: "Ditolak",
};

const orderStatusLabel: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Pending",
  [OrderStatus.PAYMENT_FAILED]: "Payment gagal",
  [OrderStatus.PAID]: "Dibayar",
  [OrderStatus.CONFIRMED]: "Dikonfirmasi",
  [OrderStatus.PREPARING]: "Disiapkan",
  [OrderStatus.READY]: "Pickup",
  [OrderStatus.COMPLETED]: "Selesai",
  [OrderStatus.NO_SHOW]: "Tidak Diambil",
  [OrderStatus.CANCELLED]: "Dibatalkan",
  [OrderStatus.REFUNDED]: "Refunded",
};

const refundStatusLabel: Record<RefundStatus, string> = {
  [RefundStatus.PENDING]: "Pending",
  [RefundStatus.REVIEWING]: "Reviewing",
  [RefundStatus.APPROVED]: "Approved",
  [RefundStatus.REJECTED]: "Rejected",
  [RefundStatus.PAID]: "Paid",
};

async function buildGlobalSearchResults(query: string, dateWhere?: { gte?: Date; lte?: Date }) {
  if (!query) {
    return [];
  }

  const [
    matchedUsers,
    matchedRestaurants,
    matchedMenuItems,
    matchedOrders,
    matchedRefunds,
    matchedApplications,
    matchedSupportTickets,
    matchedVouchers,
    matchedAuditLogs,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: [UserRole.CUSTOMER, UserRole.OWNER, UserRole.ADMIN] },
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { name: textContains(query) },
          { email: textContains(query) },
          { phone: textContains(query) },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.restaurant.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { name: textContains(query) },
          { slug: textContains(query) },
          { city: textContains(query) },
          { owner: { is: { name: textContains(query) } } },
          { owner: { is: { email: textContains(query) } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { owner: true },
    }),
    prisma.menuItem.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { name: textContains(query) },
          { category: textContains(query) },
          { restaurant: { is: { name: textContains(query) } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { restaurant: true },
    }),
    prisma.order.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { orderCode: textContains(query) },
          { customer: { is: { name: textContains(query) } } },
          { customer: { is: { email: textContains(query) } } },
          { restaurant: { is: { name: textContains(query) } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true, restaurant: true },
    }),
    prisma.refundRequest.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { reason: textContains(query) },
          { description: textContains(query) },
          { customer: { is: { name: textContains(query) } } },
          { customer: { is: { email: textContains(query) } } },
          { order: { is: { orderCode: textContains(query) } } },
          { order: { is: { restaurant: { is: { name: textContains(query) } } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true, order: { include: { restaurant: true } } },
    }),
    prisma.restaurantApplication.findMany({
      where: {
        ...(dateWhere ? { submittedAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { applicantName: textContains(query) },
          { email: textContains(query) },
          { phone: textContains(query) },
          { businessName: textContains(query) },
          { businessType: textContains(query) },
          { city: textContains(query) },
        ],
      },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
    prisma.supportTicket.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { orderCode: textContains(query) },
          { category: textContains(query) },
          { subject: textContains(query) },
          { message: textContains(query) },
          { user: { is: { name: textContains(query) } } },
          { user: { is: { email: textContains(query) } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true },
    }),
    prisma.voucher.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { code: textContains(query) },
          { title: textContains(query) },
          { campaignName: textContains(query) },
          { category: textContains(query) },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.adminActionLog.findMany({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        OR: [
          { id: textContains(query) },
          { action: textContains(query) },
          { targetType: textContains(query) },
          { targetId: textContains(query) },
          { admin: { is: { name: textContains(query) } } },
          { admin: { is: { email: textContains(query) } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { admin: true },
    }),
  ]);

  return [
    ...matchedUsers.map((user) => ({
      id: user.id,
      type: "user",
      title: user.name,
      subtitle: `${user.email} - ${user.role}`,
      status: user.status,
      href: `/admin/users/${user.id}`,
      meta: formatDate(user.createdAt),
    })),
    ...matchedRestaurants.map((restaurant) => ({
      id: restaurant.id,
      type: "restaurant",
      title: restaurant.name,
      subtitle: `${restaurant.city} - Owner: ${restaurant.owner.name}`,
      status: restaurant.status,
      href: "/admin/dashboard?tab=verification",
      meta: formatDate(restaurant.createdAt),
    })),
    ...matchedMenuItems.map((item) => ({
      id: item.id,
      type: "menu",
      title: item.name,
      subtitle: `${item.restaurant.name} - ${item.category}`,
      status: item.status,
      href: "/admin/dashboard?tab=analytics",
      meta: formatRp(item.discountedPrice),
    })),
    ...matchedOrders.map((order) => ({
      id: order.id,
      type: "order",
      title: order.orderCode,
      subtitle: `${order.customer.name} - ${order.restaurant.name}`,
      status: orderStatusLabel[order.status],
      href: `/admin/transactions/${order.orderCode}`,
      meta: formatRp(order.total),
    })),
    ...matchedRefunds.map((refund) => ({
      id: refund.id,
      type: "refund",
      title: `Refund ${refund.order.orderCode}`,
      subtitle: `${refund.customer.name} - ${refund.order.restaurant.name}`,
      status: refundStatusLabel[refund.status],
      href: `/admin/refunds/${refund.order.orderCode}`,
      meta: formatRp(refund.amount),
    })),
    ...matchedApplications.map((application) => ({
      id: application.id,
      type: "application",
      title: application.businessName,
      subtitle: `${application.applicantName} - ${application.email}`,
      status: applicationLabel[application.status],
      href: `/admin/verifications/${application.id}`,
      meta: formatDate(application.submittedAt),
    })),
    ...matchedSupportTickets.map((ticket) => ({
      id: ticket.id,
      type: "support",
      title: ticket.subject,
      subtitle: `${ticket.user.name} - ${ticket.category}`,
      status: ticket.status,
      href: "/admin/support",
      meta: ticket.orderCode || "Tanpa order",
    })),
    ...matchedVouchers.map((voucher) => ({
      id: voucher.id,
      type: "voucher",
      title: voucher.code,
      subtitle: voucher.title,
      status: voucher.active ? "Aktif" : "Nonaktif",
      href: "/admin/vouchers",
      meta: voucher.campaignName || "Voucher",
    })),
    ...matchedAuditLogs.map((log) => ({
      id: log.id,
      type: "audit",
      title: log.action,
      subtitle: `${log.targetType}${log.targetId ? ` - ${log.targetId}` : ""}`,
      status: log.admin?.name || "System",
      href: "/admin/settings",
      meta: formatDate(log.createdAt),
    })),
  ].slice(0, 24);
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!requireAdmin(session)) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const url = new URL(request.url);
  const searchQuery = (url.searchParams.get("q") || "").trim();
  const format = url.searchParams.get("format");
  const roleFilter = userRoleParam[url.searchParams.get("role") || ""];
  const userStatusFilter = userStatusParam[url.searchParams.get("userStatus") || ""];
  const applicationStatusFilter =
    applicationStatusParam[url.searchParams.get("applicationStatus") || ""];
  const orderStatusFilter = orderStatusParam[url.searchParams.get("orderStatus") || ""];
  const refundStatusValue = url.searchParams.get("refundStatus") || "";
  const refundStatusFilter = refundStatusParam[refundStatusValue];
  const { from, to } = getDateRange(url);
  const dateWhere = getDateWhere(from, to);
  const userSearchWhere = searchQuery
    ? {
        OR: [
          { id: textContains(searchQuery) },
          { name: textContains(searchQuery) },
          { email: textContains(searchQuery) },
          { phone: textContains(searchQuery) },
        ],
      }
    : {};
  const orderSearchWhere = searchQuery
    ? {
        OR: [
          { id: textContains(searchQuery) },
          { orderCode: textContains(searchQuery) },
          { customer: { is: { name: textContains(searchQuery) } } },
          { customer: { is: { email: textContains(searchQuery) } } },
          { restaurant: { is: { name: textContains(searchQuery) } } },
        ],
      }
    : {};
  const applicationSearchWhere = searchQuery
    ? {
        OR: [
          { id: textContains(searchQuery) },
          { applicantName: textContains(searchQuery) },
          { email: textContains(searchQuery) },
          { businessName: textContains(searchQuery) },
          { businessType: textContains(searchQuery) },
        ],
      }
    : {};
  const refundSearchWhere = searchQuery
    ? {
        OR: [
          { id: textContains(searchQuery) },
          { reason: textContains(searchQuery) },
          { description: textContains(searchQuery) },
          { customer: { is: { name: textContains(searchQuery) } } },
          { customer: { is: { email: textContains(searchQuery) } } },
          { order: { is: { orderCode: textContains(searchQuery) } } },
          { order: { is: { restaurant: { is: { name: textContains(searchQuery) } } } } },
        ],
      }
    : {};
  const auditSearchWhere = searchQuery
    ? {
        OR: [
          { id: textContains(searchQuery) },
          { action: textContains(searchQuery) },
          { targetType: textContains(searchQuery) },
          { targetId: textContains(searchQuery) },
          { admin: { is: { name: textContains(searchQuery) } } },
          { admin: { is: { email: textContains(searchQuery) } } },
        ],
      }
    : {};
  const userWhere = {
    role: roleFilter || { in: [UserRole.CUSTOMER, UserRole.OWNER] },
    ...(userStatusFilter ? { status: userStatusFilter } : {}),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...userSearchWhere,
  };
  const applicationWhere = {
    ...(applicationStatusFilter ? { status: applicationStatusFilter } : {}),
    ...(dateWhere ? { submittedAt: dateWhere } : {}),
    ...applicationSearchWhere,
  };
  const orderWhere = {
    ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...orderSearchWhere,
  };
  const refundWhere = {
    ...(refundStatusFilter
      ? { status: refundStatusFilter }
      : refundStatusValue === "all"
        ? {}
        : { status: { in: [RefundStatus.PENDING, RefundStatus.REVIEWING] } }),
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...refundSearchWhere,
  };
  const auditWhere = {
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...auditSearchWhere,
  };

  const loadDashboardSnapshot = async () => {
    const [
      users,
      totalUsers,
      restaurants,
      totalRestaurants,
      orders,
      totalTransactions,
      menuCategoryStats,
      applications,
      refundRequests,
      auditLogs,
      globalSearchResults,
    ] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.user.count({
        where: userWhere,
      }),
      prisma.restaurant.findMany({
        where: {
          status: {
            not: RestaurantStatus.REJECTED,
          },
          ...(dateWhere ? { createdAt: dateWhere } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { owner: true },
      }),
      prisma.restaurant.count({
        where: {
          status: {
            not: RestaurantStatus.REJECTED,
          },
          ...(dateWhere ? { createdAt: dateWhere } : {}),
        },
      }),
      prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: true,
          restaurant: true,
        },
      }),
      prisma.order.count({ where: orderWhere }),
      prisma.menuItem.groupBy({
        by: ["category"],
        _sum: {
          soldCount: true,
        },
      }),
      prisma.restaurantApplication.findMany({
        where: applicationWhere,
        orderBy: { submittedAt: "desc" },
        take: 100,
        include: {
          _count: {
            select: { documents: true },
          },
        },
      }),
      prisma.refundRequest.findMany({
        where: refundWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          customer: true,
          order: {
            include: {
              restaurant: true,
            },
          },
        },
      }),
      prisma.adminActionLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { admin: true },
      }),
      buildGlobalSearchResults(searchQuery, dateWhere),
    ]);

    return {
      users,
      totalUsers,
      restaurants,
      totalRestaurants,
      orders,
      totalTransactions,
      menuCategoryStats,
      applications,
      refundRequests,
      auditLogs,
      globalSearchResults,
    };
  };

  if (format === "csv") {
    const {
      users,
      restaurants,
      orders,
      applications,
      refundRequests,
      auditLogs,
    } = await loadDashboardSnapshot();
    const csv = makeCsv(
      [
        "section",
        "id",
        "primary",
        "secondary",
        "status",
        "amount",
        "created_at",
        "metadata",
      ],
      [
        ...users.map((user) => [
          "user",
          user.id,
          user.name,
          user.email,
          user.status,
          "",
          user.createdAt.toISOString(),
          user.role,
        ]),
        ...restaurants.map((restaurant) => [
          "restaurant",
          restaurant.id,
          restaurant.name,
          restaurant.owner.email,
          restaurant.status,
          "",
          restaurant.createdAt.toISOString(),
          restaurant.city,
        ]),
        ...orders.map((order) => [
          "order",
          order.orderCode,
          order.customer.email,
          order.restaurant.name,
          order.status,
          order.total,
          order.createdAt.toISOString(),
          order.paymentStatus,
        ]),
        ...applications.map((application) => [
          "restaurant_application",
          application.id,
          application.businessName,
          application.email,
          application.status,
          "",
          application.submittedAt.toISOString(),
          application.city,
        ]),
        ...refundRequests.map((refund) => [
          "refund",
          refund.id,
          refund.order.orderCode,
          refund.customer.email,
          refund.status,
          refund.amount,
          refund.createdAt.toISOString(),
          refund.reason,
        ]),
        ...auditLogs.map((log) => [
          "audit_log",
          log.id,
          log.action,
          log.admin?.email || "system",
          log.targetType,
          "",
          log.createdAt.toISOString(),
          {
            targetId: log.targetId,
            metadata: log.metadata,
          },
        ]),
      ],
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="resqfood-admin-export-${Date.now()}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const {
      users,
      totalUsers,
      restaurants,
      totalRestaurants,
      orders,
      totalTransactions,
      menuCategoryStats,
      applications,
      refundRequests,
      auditLogs,
    } = await loadDashboardSnapshot();
    const pdf = buildAdminDashboardReportPdf({
      generatedAt: new Date(),
      filters: {
        query: searchQuery,
        role: url.searchParams.get("role") || "all",
        userStatus: url.searchParams.get("userStatus") || "all",
        applicationStatus: url.searchParams.get("applicationStatus") || "all",
        orderStatus: url.searchParams.get("orderStatus") || "all",
        refundStatus: refundStatusValue || "needs_review",
        dateFrom: from,
        dateTo: to,
      },
      metrics: {
        totalUsers,
        totalRestaurants,
        totalTransactions,
        foodSavedItems: menuCategoryStats.reduce(
          (total, item) => total + (item._sum.soldCount ?? 0),
          0,
        ),
      },
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      })),
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        ownerEmail: restaurant.owner.email,
        city: restaurant.city,
        status: restaurant.status,
        createdAt: restaurant.createdAt,
      })),
      orders: orders.map((order) => ({
        orderCode: order.orderCode,
        customerEmail: order.customer.email,
        restaurantName: order.restaurant.name,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt,
      })),
      applications: applications.map((application) => ({
        id: application.id,
        businessName: application.businessName,
        applicantName: application.applicantName,
        email: application.email,
        city: application.city,
        status: application.status,
        submittedAt: application.submittedAt,
      })),
      refunds: refundRequests.map((refund) => ({
        id: refund.id,
        orderCode: refund.order.orderCode,
        customerEmail: refund.customer.email,
        restaurantName: refund.order.restaurant.name,
        status: refund.status,
        amount: refund.amount,
        reason: refund.reason,
        createdAt: refund.createdAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actorEmail: log.admin?.email || "system",
        createdAt: log.createdAt,
      })),
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resqfood-admin-export-${Date.now()}.pdf"`,
      },
    });
  }

  const dashboardPayload = await getCachedJson(
    {
      key: `admin-dashboard:${JSON.stringify({
        searchQuery,
        role: url.searchParams.get("role") || "",
        userStatus: url.searchParams.get("userStatus") || "",
        applicationStatus: url.searchParams.get("applicationStatus") || "",
        orderStatus: url.searchParams.get("orderStatus") || "",
        refundStatus: refundStatusValue,
        dateFrom: from?.toISOString() ?? null,
        dateTo: to?.toISOString() ?? null,
      })}`,
      ttlMs: searchQuery ? 4_000 : 6_000,
      tags: ["admin-dashboard"],
    },
    async () => {
      const {
        users,
        totalUsers,
        totalRestaurants,
        orders,
        totalTransactions,
        menuCategoryStats,
        applications,
        refundRequests,
        auditLogs,
        globalSearchResults,
      } = await loadDashboardSnapshot();
      const totalOrderAmount = orders.reduce((total, order) => total + order.total, 0);
      const soldItemCount = menuCategoryStats.reduce(
        (total, item) => total + (item._sum.soldCount ?? 0),
        0,
      );
      const categoryTotals = menuCategoryStats.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.category] = item._sum.soldCount ?? 0;
          return acc;
        },
        {},
      );
      const categoryTotalCount = Object.values(categoryTotals).reduce(
        (total, value) => total + value,
        0,
      );
      const foodDistribution = Object.entries(categoryTotals)
        .sort(([, left], [, right]) => right - left)
        .slice(0, 3)
        .map(([label, value], index) => ({
          label,
          value:
            categoryTotalCount > 0
              ? Math.round((value / categoryTotalCount) * 100)
              : 0,
          className: ["bg-blue-500", "bg-amber-400", "bg-purple-500"][index],
          textClassName: ["text-blue-600", "text-amber-600", "text-purple-600"][index],
        }));
      const weekDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        date.setHours(0, 0, 0, 0);
        return date;
      });
      const weeklySales = weekDays.map((date) => {
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const dayTotal = orders
          .filter((order) => {
            const createdAt = new Date(order.createdAt);
            return createdAt >= date && createdAt < nextDate;
          })
          .reduce((total, order) => total + order.total, 0);

        return {
          day: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date),
          value: totalOrderAmount > 0 ? Math.round((dayTotal / totalOrderAmount) * 100) : 0,
        };
      });

      return {
        ok: true,
        metrics: {
          totalUsers,
          totalRestaurants,
          totalTransactions,
          foodSavedItems: soldItemCount,
        },
        users: users.map((user) => ({
          id: user.id,
          joinedAt: formatDate(user.createdAt),
          name: user.name,
          email: user.email,
          role: user.role === UserRole.OWNER ? "owner" : "customer",
          status: user.status === "SUSPENDED" ? "banned" : "active",
        })),
        verificationStores: applications.map((application) => ({
          id: application.id,
          date: formatDate(application.submittedAt),
          storeName: application.businessName,
          category: application.businessType,
          owner: application.applicantName,
          email: application.email,
          phone: application.phone,
          address: application.address,
          latitude: application.latitude,
          longitude: application.longitude,
          status: application.status.toLowerCase(),
          statusLabel: applicationLabel[application.status],
          documentCount: application._count.documents,
        })),
        recentTransactions: orders.slice(0, 12).map((order) => ({
          id: order.orderCode,
          customer: order.customer.name,
          store: order.restaurant.name,
          total: formatRp(order.total),
          status: orderStatusLabel[order.status],
        })),
        refundDisputes: refundRequests.map((refund) => ({
          id: refund.id,
          orderId: refund.order.orderCode,
          customer: refund.customer.name,
          resto: refund.order.restaurant.name,
          reason: refund.reason,
          total: formatRp(refund.amount),
          status: refundStatusLabel[refund.status],
        })),
        attentionItems: [
          {
            title: `${refundRequests.length} refund perlu review`,
            meta: "Berdasarkan refund pending/reviewing terbaru",
            level: refundRequests.length > 0 ? "Tinggi" : "Aman",
          },
          {
            title: `${applications.filter((item) => item.status === ApplicationStatus.PENDING).length} restoran perlu verifikasi`,
            meta: "Ajuan mitra dengan status pending",
            level: applications.some((item) => item.status === ApplicationStatus.PENDING)
              ? "Sedang"
              : "Aman",
          },
          {
            title: `${totalTransactions} transaksi tercatat`,
            meta: "Data order terbaru",
            level: "Pantau",
          },
        ],
        weeklySales,
        foodDistribution,
        globalSearchResults,
        auditLogs: auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          createdAt: log.createdAt.toISOString(),
          admin: log.admin
            ? {
                id: log.admin.id,
                name: log.admin.name,
                email: log.admin.email,
              }
            : null,
          metadata: log.metadata,
        })),
      };
    },
  );

  return NextResponse.json(dashboardPayload, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
