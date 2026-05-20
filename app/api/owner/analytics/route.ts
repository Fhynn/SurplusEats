import { OrderStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedPeriods = new Set([7, 30, 90]);
const kgPerPortion = 0.2;
const co2eKgPerFoodKg = 2.5;

type AnalyticsOrder = Awaited<ReturnType<typeof getOrdersForPeriod>>[number];
type ChartBucket = {
  day: string;
  value: number;
  orders: number;
};
type BestSeller = {
  name: string;
  category: string;
  sold: number;
  revenue: number;
  stockRate: number;
};

function getPeriodDays(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 7);

  return allowedPeriods.has(days) ? days : 7;
}

function subtractDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function getNetRevenue(order: Pick<AnalyticsOrder, "subtotal" | "discount">) {
  return Math.max(0, order.subtotal - order.discount);
}

function getTrendPercent(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatTrend(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function formatKg(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  })} Kg`;
}

function formatCo2e(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} Ton`;
  }

  return `${Math.round(value).toLocaleString("id-ID")} Kg`;
}

async function getOrdersForPeriod(restaurantId: string, from: Date, to: Date) {
  return prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function getCompletedOrders(orders: AnalyticsOrder[]) {
  return orders.filter((order) => order.status === OrderStatus.COMPLETED);
}

function getPortionCount(orders: AnalyticsOrder[]) {
  return orders.reduce(
    (total, order) =>
      total +
      order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
    0,
  );
}

function createRevenueBuckets(
  orders: AnalyticsOrder[],
  start: Date,
  end: Date,
  periodDays: number,
): ChartBucket[] {
  const bucketCount = 7;
  const startMs = start.getTime();
  const bucketSize = Math.max(1, (end.getTime() - startMs) / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketDate = new Date(startMs + bucketSize * index);
    const day =
      periodDays === 7
        ? new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(bucketDate)
        : `P${index + 1}`;

    return { day, value: 0, orders: 0 };
  });

  for (const order of getCompletedOrders(orders)) {
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((order.createdAt.getTime() - startMs) / bucketSize)),
    );
    buckets[index].value += getNetRevenue(order);
    buckets[index].orders += 1;
  }

  return buckets;
}

function createBestSellers(orders: AnalyticsOrder[]): BestSeller[] {
  const sellerMap = new Map<
    string,
    { category: string; sold: number; revenue: number }
  >();

  for (const order of getCompletedOrders(orders)) {
    for (const item of order.items) {
      const existing = sellerMap.get(item.menuNameSnapshot) ?? {
        category: item.menuItem?.category ?? "Menu",
        sold: 0,
        revenue: 0,
      };

      existing.sold += item.quantity;
      existing.revenue += item.priceSnapshot * item.quantity;
      sellerMap.set(item.menuNameSnapshot, existing);
    }
  }

  const sellers = Array.from(sellerMap.entries())
    .map(([name, value]) => ({
      name,
      category: value.category,
      sold: value.sold,
      revenue: value.revenue,
      stockRate: 0,
    }))
    .sort((first, second) => second.sold - first.sold)
    .slice(0, 3);
  const maxSold = Math.max(1, ...sellers.map((seller) => seller.sold));

  return sellers.map((seller) => ({
    ...seller,
    stockRate: Math.max(8, Math.round((seller.sold / maxSold) * 100)),
  }));
}

function createPickupWindows(orders: AnalyticsOrder[]) {
  const hourCounts = new Map<string, number>();
  const completedOrders = getCompletedOrders(orders);

  for (const order of completedOrders) {
    const pickupDate = order.pickupTime ?? order.createdAt;
    const hour = `${pickupDate.getHours().toString().padStart(2, "0")}:00`;
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  const entries = Array.from(hourCounts.entries()).sort(
    ([firstHour, firstCount], [secondHour, secondCount]) =>
      secondCount - firstCount || firstHour.localeCompare(secondHour),
  );
  const selectedEntries =
    entries.length > 0
      ? entries.slice(0, 5).sort(([firstHour], [secondHour]) =>
          firstHour.localeCompare(secondHour),
        )
      : ["17:00", "18:00", "19:00", "20:00", "21:00"].map(
          (hour) => [hour, 0] as [string, number],
        );
  const maxCount = Math.max(1, ...selectedEntries.map(([, count]) => count));

  return selectedEntries.map(([time, count]) => ({
    time,
    orders: count,
    value: Math.round((count / maxCount) * 100),
  }));
}

function createRecommendation(pickupWindows: ReturnType<typeof createPickupWindows>) {
  const peak = [...pickupWindows].sort(
    (first, second) => second.orders - first.orders,
  )[0];

  if (!peak || peak.orders === 0) {
    return "Belum ada cukup order selesai untuk membuat rekomendasi operasional.";
  }

  return `Siapkan staf pickup ekstra sekitar jam ${peak.time} karena periode ini paling ramai.`;
}

function createAnalytics(
  orders: AnalyticsOrder[],
  previousOrders: AnalyticsOrder[],
  periodDays: number,
  restaurant: {
    rating: number;
    reviewCount: number;
  },
) {
  const now = new Date();
  const from = subtractDays(periodDays);
  const completedOrders = getCompletedOrders(orders);
  const previousCompletedOrders = getCompletedOrders(previousOrders);
  const netRevenue = completedOrders.reduce(
    (total, order) => total + getNetRevenue(order),
    0,
  );
  const previousNetRevenue = previousCompletedOrders.reduce(
    (total, order) => total + getNetRevenue(order),
    0,
  );
  const portions = getPortionCount(completedOrders);
  const previousPortions = getPortionCount(previousCompletedOrders);
  const foodSavedKg = portions * kgPerPortion;
  const previousFoodSavedKg = previousPortions * kgPerPortion;
  const revenue = createRevenueBuckets(orders, from, now, periodDays);
  const bestSellers = createBestSellers(orders);
  const pickupWindows = createPickupWindows(orders);
  const peakBucket = [...revenue].sort((first, second) => second.value - first.value)[0];
  const targetKg = periodDays * 3;
  const target = Math.min(100, Math.round((foodSavedKg / Math.max(1, targetKg)) * 100));
  const topSeller = bestSellers[0];
  const peakPickup = [...pickupWindows].sort(
    (first, second) => second.orders - first.orders,
  )[0];

  return {
    kpis: {
      netRevenue,
      revenueTrend: formatTrend(getTrendPercent(netRevenue, previousNetRevenue)),
      completedOrders: completedOrders.length,
      orderTrend: formatTrend(
        getTrendPercent(completedOrders.length, previousCompletedOrders.length),
      ),
      foodSavedKg,
      foodSavedTrend: formatTrend(
        getTrendPercent(foodSavedKg, previousFoodSavedKg),
      ),
    },
    revenue,
    impact: {
      savedKg: formatKg(foodSavedKg),
      target,
      targetLabel:
        periodDays === 7
          ? "Target mingguan"
          : periodDays === 30
            ? "Target bulanan"
            : "Target kuartal",
      co2e: formatCo2e(foodSavedKg * co2eKgPerFoodKg),
      portions: portions.toLocaleString("id-ID"),
    },
    bestSellers,
    pickupWindows,
    recommendation: createRecommendation(pickupWindows),
    peakLabel:
      peakBucket && peakBucket.value > 0 ? `Peak ${peakBucket.day}` : "Belum ada peak",
    insights: [
      {
        type: "time",
        title: "Jam pickup paling ramai",
        value: peakPickup?.orders ? peakPickup.time : "Belum ada data",
        description: peakPickup?.orders
          ? `${peakPickup.orders} order selesai terkonsentrasi pada jam ini.`
          : "Order selesai belum cukup untuk membaca pola pickup.",
      },
      {
        type: "rating",
        title: "Rating toko",
        value:
          restaurant.reviewCount > 0
            ? `${restaurant.rating.toFixed(1)} / 5.0`
            : "Belum ada rating",
        description:
          restaurant.reviewCount > 0
            ? `${restaurant.reviewCount} ulasan customer tersimpan.`
            : "Rating akan muncul setelah customer memberi ulasan.",
      },
      {
        type: "menu",
        title: "Menu prioritas",
        value: topSeller?.name ?? "Belum ada data",
        description: topSeller
          ? `${topSeller.sold} porsi terjual pada periode ini.`
          : "Menu terlaris akan muncul setelah ada order selesai.",
      },
    ],
  };
}

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const periodDays = getPeriodDays(request);
  const now = new Date();
  const from = subtractDays(periodDays);
  const previousFrom = subtractDays(periodDays * 2);
  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      name: true,
      rating: true,
      reviewCount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return NextResponse.json({
      ok: true,
      restaurant: null,
      periodDays,
      analytics: null,
    });
  }

  const [orders, previousOrders] = await Promise.all([
    getOrdersForPeriod(restaurant.id, from, now),
    getOrdersForPeriod(restaurant.id, previousFrom, from),
  ]);

  return NextResponse.json({
    ok: true,
    restaurant,
    periodDays,
    analytics: createAnalytics(orders, previousOrders, periodDays, restaurant),
  });
}
