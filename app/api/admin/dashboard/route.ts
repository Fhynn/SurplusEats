import {
  ApplicationStatus,
  OrderStatus,
  RefundStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  const session = await getCurrentSession();

  if (!requireAdmin(session)) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const [
    users,
    totalUsers,
    restaurants,
    orders,
    menuItems,
    pendingApplications,
    refundRequests,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [UserRole.CUSTOMER, UserRole.OWNER] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.count({
      where: { role: { in: [UserRole.CUSTOMER, UserRole.OWNER] } },
    }),
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customer: true,
        restaurant: true,
      },
    }),
    prisma.menuItem.findMany({
      select: {
        category: true,
        soldCount: true,
      },
    }),
    prisma.restaurantApplication.findMany({
      where: { status: ApplicationStatus.PENDING },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    prisma.refundRequest.findMany({
      where: {
        status: { in: [RefundStatus.PENDING, RefundStatus.REVIEWING] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        customer: true,
        order: {
          include: {
            restaurant: true,
          },
        },
      },
    }),
  ]);

  const totalOrderAmount = orders.reduce((total, order) => total + order.total, 0);
  const soldItemCount = menuItems.reduce((total, item) => total + item.soldCount, 0);
  const categoryTotals = menuItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.soldCount;
    return acc;
  }, {});
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

  return NextResponse.json({
    ok: true,
    metrics: {
      totalUsers,
      totalRestaurants: restaurants.length,
      totalTransactions: orders.length,
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
    verificationStores: pendingApplications.map((application) => ({
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
    })),
    recentTransactions: orders.slice(0, 5).map((order) => ({
      id: order.orderCode,
      customer: order.customer.name,
      store: order.restaurant.name,
      total: formatRp(order.total),
      status:
        order.status === OrderStatus.COMPLETED
          ? "Selesai"
          : order.status === OrderStatus.READY
            ? "Pickup"
            : "Diproses",
    })),
    refundDisputes: refundRequests.map((refund) => ({
      orderId: refund.order.orderCode,
      customer: refund.customer.name,
      resto: refund.order.restaurant.name,
      reason: refund.reason,
      total: formatRp(refund.amount),
    })),
    attentionItems: [
      {
        title: `${refundRequests.length} refund perlu review`,
        meta: "Berdasarkan refund pending/reviewing terbaru",
        level: refundRequests.length > 0 ? "Tinggi" : "Aman",
      },
      {
        title: `${pendingApplications.length} restoran perlu verifikasi`,
        meta: "Ajuan mitra dengan status pending",
        level: pendingApplications.length > 0 ? "Sedang" : "Aman",
      },
      {
        title: `${orders.length} transaksi tercatat`,
        meta: "Data order terbaru",
        level: "Pantau",
      },
    ],
    weeklySales,
    foodDistribution,
  });
}
