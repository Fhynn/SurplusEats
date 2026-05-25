import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminUserRouteProps {
  params: Promise<{ id: string }>;
}

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

export async function GET(_request: Request, { params }: AdminUserRouteProps) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
      applications: { orderBy: { submittedAt: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { restaurant: true, items: true, refundRequest: true, review: true },
      },
      ownedRestaurants: {
        include: {
          menuItems: true,
          orders: { include: { refundRequest: true } },
          reviews: true,
        },
      },
      refunds: true,
    },
  });

  if (!user || user.role === UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "User tidak ditemukan." },
      { status: 404 },
    );
  }

  const ownedOrders = user.ownedRestaurants.flatMap(
    (restaurant) => restaurant.orders,
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
      lastLogin: user.updatedAt ? formatDateTime(user.updatedAt) : "-",
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
    activities: relevantOrders.slice(0, 8).map((order) => ({
      id: order.id,
      title: `Order ${order.orderCode}`,
      description: `${order.status} - ${formatRp(order.total)}`,
      time: formatDateTime(order.updatedAt),
      tone:
        order.status === "CANCELLED" || order.status === "REFUNDED"
          ? "red"
          : order.status === "NO_SHOW"
            ? "amber"
          : order.status === "COMPLETED"
            ? "emerald"
            : "blue",
    })),
  });
}

export async function PATCH(request: Request, { params }: AdminUserRouteProps) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const parsed = updateUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Status user tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await prisma.adminActionLog.create({
    data: {
      adminId: session.userId,
      action: `USER_${parsed.data.status}`,
      targetType: "user",
      targetId: user.id,
    },
  });

  return NextResponse.json({ ok: true, user });
}
