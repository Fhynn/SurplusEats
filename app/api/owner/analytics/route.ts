import { OrderStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCachedJson } from "@/lib/server-cache";

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
  orderCount: number;
  avgPrice: number;
  refundCount: number;
  contributionRate: number;
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

function formatRate(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
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
      refundRequest: true,
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

async function getHistoricalCompletedCustomerCounts(restaurantId: string, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: OrderStatus.COMPLETED,
      createdAt: {
        lt: to,
      },
    },
    select: {
      customerId: true,
    },
  });

  return orders.reduce((counts, order) => {
    counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
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

function getOperationalOrders(orders: AnalyticsOrder[]) {
  return orders.filter(
    (order) =>
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED,
  );
}

function getRefundedOrders(orders: AnalyticsOrder[]) {
  return orders.filter(
    (order) => order.status === OrderStatus.REFUNDED || Boolean(order.refundRequest),
  );
}

function getRate(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

function getRepeatCustomerRate(
  completedOrders: AnalyticsOrder[],
  historicalCompletedCustomerCounts: Map<string, number>,
) {
  const uniqueCustomerIds = Array.from(
    new Set(completedOrders.map((order) => order.customerId)),
  );

  if (uniqueCustomerIds.length === 0) {
    return {
      rate: 0,
      repeatCustomers: 0,
      uniqueCustomers: 0,
    };
  }

  const repeatCustomers = uniqueCustomerIds.filter(
    (customerId) => (historicalCompletedCustomerCounts.get(customerId) ?? 0) > 1,
  ).length;

  return {
    rate: getRate(repeatCustomers, uniqueCustomerIds.length),
    repeatCustomers,
    uniqueCustomers: uniqueCustomerIds.length,
  };
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
    {
      category: string;
      sold: number;
      revenue: number;
      orderCodes: Set<string>;
      refundCount: number;
    }
  >();
  const completedOrders = getCompletedOrders(orders);
  const totalSellerRevenue = Math.max(
    1,
    completedOrders.reduce((total, order) => total + getNetRevenue(order), 0),
  );

  for (const order of completedOrders) {
    for (const item of order.items) {
      const existing = sellerMap.get(item.menuNameSnapshot) ?? {
        category: item.menuItem?.category ?? "Menu",
        sold: 0,
        revenue: 0,
        orderCodes: new Set<string>(),
        refundCount: 0,
      };

      existing.sold += item.quantity;
      existing.revenue += item.priceSnapshot * item.quantity;
      existing.orderCodes.add(order.orderCode);
      if (order.refundRequest || order.status === OrderStatus.REFUNDED) {
        existing.refundCount += 1;
      }
      sellerMap.set(item.menuNameSnapshot, existing);
    }
  }

  const sellers = Array.from(sellerMap.entries())
    .map(([name, value]) => ({
      name,
      category: value.category,
      sold: value.sold,
      revenue: value.revenue,
      orderCount: value.orderCodes.size,
      avgPrice: value.sold > 0 ? Math.round(value.revenue / value.sold) : 0,
      refundCount: value.refundCount,
      contributionRate: Math.round((value.revenue / totalSellerRevenue) * 1000) / 10,
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
  const hourCounts = new Map<string, { orders: number; revenue: number }>();
  const completedOrders = getCompletedOrders(orders);

  for (const order of completedOrders) {
    const pickupDate = order.pickupTime ?? order.createdAt;
    const hour = `${pickupDate.getHours().toString().padStart(2, "0")}:00`;
    const existing = hourCounts.get(hour) ?? { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += getNetRevenue(order);
    hourCounts.set(hour, existing);
  }

  const entries = Array.from(hourCounts.entries()).sort(
    ([firstHour, firstValue], [secondHour, secondValue]) =>
      secondValue.orders - firstValue.orders || firstHour.localeCompare(secondHour),
  );
  const selectedEntries =
    entries.length > 0
      ? entries.slice(0, 5).sort(([firstHour], [secondHour]) =>
          firstHour.localeCompare(secondHour),
        )
      : ["17:00", "18:00", "19:00", "20:00", "21:00"].map(
          (hour) => [hour, { orders: 0, revenue: 0 }] as [
            string,
            { orders: number; revenue: number },
          ],
        );
  const totalOrders = Math.max(
    1,
    completedOrders.length,
  );
  const maxCount = Math.max(
    1,
    ...selectedEntries.map(([, value]) => value.orders),
  );

  return selectedEntries.map(([time, value]) => ({
    time,
    orders: value.orders,
    revenue: value.revenue,
    share: getRate(value.orders, totalOrders),
    value: Math.round((value.orders / maxCount) * 100),
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
  historicalCompletedCustomerCounts: Map<string, number>,
) {
  const now = new Date();
  const from = subtractDays(periodDays);
  const completedOrders = getCompletedOrders(orders);
  const previousCompletedOrders = getCompletedOrders(previousOrders);
  const operationalOrders = getOperationalOrders(orders);
  const previousOperationalOrders = getOperationalOrders(previousOrders);
  const refundedOrders = getRefundedOrders(orders);
  const previousRefundedOrders = getRefundedOrders(previousOrders);
  const conversionRate = getRate(completedOrders.length, operationalOrders.length);
  const previousConversionRate = getRate(
    previousCompletedOrders.length,
    previousOperationalOrders.length,
  );
  const refundRate = getRate(refundedOrders.length, operationalOrders.length);
  const previousRefundRate = getRate(
    previousRefundedOrders.length,
    previousOperationalOrders.length,
  );
  const repeatCustomer = getRepeatCustomerRate(
    completedOrders,
    historicalCompletedCustomerCounts,
  );
  const previousRepeatCustomer = getRepeatCustomerRate(
    previousCompletedOrders,
    historicalCompletedCustomerCounts,
  );
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
      conversionRate,
      conversionTrend: formatTrend(
        getTrendPercent(conversionRate, previousConversionRate),
      ),
      refundRate,
      refundTrend: formatTrend(getTrendPercent(refundRate, previousRefundRate)),
      repeatCustomerRate: repeatCustomer.rate,
      repeatCustomerTrend: formatTrend(
        getTrendPercent(repeatCustomer.rate, previousRepeatCustomer.rate),
      ),
      repeatCustomers: repeatCustomer.repeatCustomers,
      uniqueCustomers: repeatCustomer.uniqueCustomers,
      totalOperationalOrders: operationalOrders.length,
      refundedOrders: refundedOrders.length,
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
      {
        type: "conversion",
        title: "Conversion rate",
        value: formatRate(conversionRate),
        description: `${completedOrders.length} dari ${operationalOrders.length} order operasional selesai.`,
      },
      {
        type: "refund",
        title: "Refund rate",
        value: formatRate(refundRate),
        description: `${refundedOrders.length} order punya refund pada periode ini.`,
      },
      {
        type: "repeat",
        title: "Repeat customer",
        value: formatRate(repeatCustomer.rate),
        description: `${repeatCustomer.repeatCustomers} dari ${repeatCustomer.uniqueCustomers} customer pernah repeat order.`,
      },
    ],
  };
}

function escapeCsvCell(value: string | number | null | undefined) {
  const normalizedValue = String(value ?? "");

  if (
    normalizedValue.includes(",") ||
    normalizedValue.includes('"') ||
    normalizedValue.includes("\n")
  ) {
    return `"${normalizedValue.replaceAll('"', '""')}"`;
  }

  return normalizedValue;
}

function createAnalyticsCsv({
  restaurantName,
  periodDays,
  analytics,
}: {
  restaurantName: string;
  periodDays: number;
  analytics: ReturnType<typeof createAnalytics>;
}) {
  const rows: Array<Array<string | number>> = [
    ["section", "metric", "value", "extra"],
    ["summary", "restaurant", restaurantName, `${periodDays} hari`],
    ["kpi", "net_revenue", analytics.kpis.netRevenue, analytics.kpis.revenueTrend],
    ["kpi", "completed_orders", analytics.kpis.completedOrders, analytics.kpis.orderTrend],
    ["kpi", "food_saved_kg", analytics.kpis.foodSavedKg, analytics.kpis.foodSavedTrend],
    ["kpi", "conversion_rate", analytics.kpis.conversionRate, analytics.kpis.conversionTrend],
    ["kpi", "refund_rate", analytics.kpis.refundRate, analytics.kpis.refundTrend],
    [
      "kpi",
      "repeat_customer_rate",
      analytics.kpis.repeatCustomerRate,
      analytics.kpis.repeatCustomerTrend,
    ],
    ...analytics.bestSellers.map((seller) => [
      "best_seller",
      seller.name,
      seller.sold,
      `revenue=${seller.revenue};orders=${seller.orderCount};refund=${seller.refundCount};contribution=${seller.contributionRate}%`,
    ]),
    ...analytics.pickupWindows.map((window) => [
      "pickup_window",
      window.time,
      window.orders,
      `share=${window.share}%;revenue=${window.revenue}`,
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

async function buildOwnerAnalyticsPayload(ownerId: string, periodDays: number) {
  const now = new Date();
  const from = subtractDays(periodDays);
  const previousFrom = subtractDays(periodDays * 2);
  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      rating: true,
      reviewCount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return {
      ok: true,
      restaurant: null,
      periodDays,
      analytics: null,
    };
  }

  const [orders, previousOrders, historicalCompletedCustomerCounts] =
    await Promise.all([
      getOrdersForPeriod(restaurant.id, from, now),
      getOrdersForPeriod(restaurant.id, previousFrom, from),
      getHistoricalCompletedCustomerCounts(restaurant.id, now),
    ]);
  const analytics = createAnalytics(
    orders,
    previousOrders,
    periodDays,
    restaurant,
    historicalCompletedCustomerCounts,
  );

  return {
    ok: true,
    restaurant,
    periodDays,
    analytics,
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
  const url = new URL(request.url);
  const exportFormat = url.searchParams.get("format");
  const payload =
    exportFormat === "csv"
      ? await buildOwnerAnalyticsPayload(session.userId, periodDays)
      : await getCachedJson(
          {
            key: `owner-analytics:${session.userId}:${periodDays}`,
            ttlMs: 30_000,
            tags: [`owner-analytics:${session.userId}`],
          },
          () => buildOwnerAnalyticsPayload(session.userId, periodDays),
        );

  if (!payload.restaurant || !payload.analytics) {
    return NextResponse.json(payload);
  }

  if (exportFormat === "csv") {
    return new NextResponse(
      createAnalyticsCsv({
        restaurantName: payload.restaurant.name,
        periodDays,
        analytics: payload.analytics,
      }),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="resqfood-owner-analytics-${periodDays}d.csv"`,
        },
      },
    );
  }

  return NextResponse.json(payload);
}
