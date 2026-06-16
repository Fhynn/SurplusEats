"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Download,
  Leaf,
  PackageCheck,
  Percent,
  PieChart,
  RotateCcw,
  Star,
  TrendingUp,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { InlineNotice, StateCard } from "@/components/ui-state";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const periodOptions = [
  { label: "7 Hari", days: 7 },
  { label: "30 Hari", days: 30 },
  { label: "90 Hari", days: 90 },
] as const;

type PeriodDays = (typeof periodOptions)[number]["days"];
type KpiTone = "emerald" | "blue" | "amber" | "red" | "purple";
type ApiAnalytics = {
  kpis: {
    netRevenue: number;
    revenueTrend: string;
    completedOrders: number;
    orderTrend: string;
    foodSavedKg: number;
    foodSavedTrend: string;
    conversionRate: number;
    conversionTrend: string;
    refundRate: number;
    refundTrend: string;
    repeatCustomerRate: number;
    repeatCustomerTrend: string;
    repeatCustomers: number;
    uniqueCustomers: number;
    totalOperationalOrders: number;
    refundedOrders: number;
  };
  revenue: {
    day: string;
    value: number;
    orders: number;
  }[];
  impact: {
    savedKg: string;
    target: number;
    targetLabel: string;
    co2e: string;
    portions: string;
  };
  bestSellers: {
    name: string;
    category: string;
    sold: number;
    revenue: number;
    stockRate: number;
    orderCount: number;
    avgPrice: number;
    refundCount: number;
    contributionRate: number;
  }[];
  pickupWindows: {
    time: string;
    value: number;
    orders: number;
    revenue: number;
    share: number;
  }[];
  recommendation: string;
  peakLabel: string;
  insights: {
    type: "time" | "rating" | "menu" | "conversion" | "refund" | "repeat";
    title: string;
    value: string;
    description: string;
  }[];
};

type AnalyticsResponse = {
  ok: boolean;
  message?: string;
  restaurant: {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
  } | null;
  periodDays: PeriodDays;
  analytics: ApiAnalytics | null;
};

const toneClassByKpiTone = {
  amber: {
    iconWrapClassName: "bg-amber-50",
    iconClassName: "text-amber-600",
    trendClassName: "bg-amber-50 text-amber-600",
  },
  blue: {
    iconWrapClassName: "bg-blue-50",
    iconClassName: "text-blue-600",
    trendClassName: "bg-blue-50 text-blue-600",
  },
  emerald: {
    iconWrapClassName: "bg-emerald-50",
    iconClassName: "text-emerald-600",
    trendClassName: "bg-emerald-50 text-emerald-600",
  },
  purple: {
    iconWrapClassName: "bg-purple-50",
    iconClassName: "text-purple-600",
    trendClassName: "bg-purple-50 text-purple-600",
  },
  red: {
    iconWrapClassName: "bg-red-50",
    iconClassName: "text-red-600",
    trendClassName: "bg-red-50 text-red-600",
  },
} as const;

const insightIconByType: Record<ApiAnalytics["insights"][number]["type"], {
  icon: LucideIcon;
  className: string;
}> = {
  menu: {
    icon: UtensilsCrossed,
    className: "bg-purple-50 text-purple-600",
  },
  conversion: {
    icon: Percent,
    className: "bg-emerald-50 text-emerald-600",
  },
  rating: {
    icon: Star,
    className: "bg-amber-50 text-amber-600",
  },
  refund: {
    icon: RotateCcw,
    className: "bg-red-50 text-red-600",
  },
  repeat: {
    icon: UsersRound,
    className: "bg-blue-50 text-blue-600",
  },
  time: {
    icon: Clock3,
    className: "bg-blue-50 text-blue-600",
  },
};

const bestsellerColors = ["bg-emerald-500", "bg-blue-500", "bg-amber-400"];

function formatKgValue(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  })} Kg`;
}

function formatPercentValue(value: number) {
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  })}%`;
}

function getTrendIconClass(trend: string) {
  return trend.startsWith("-") ? "rotate-90" : "";
}

export default function OwnerAnalyticsPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodDays>(7);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const analytics = data?.analytics ?? null;
  const activePeriodLabel =
    periodOptions.find((period) => period.days === activePeriod)?.label ??
    "7 Hari";
  const maxRevenue = Math.max(1, ...(analytics?.revenue.map((item) => item.value) ?? [1]));
  const kpis = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      {
        label: "Pendapatan Bersih",
        value: formatRp(analytics.kpis.netRevenue),
        trend: analytics.kpis.revenueTrend,
        helper: `vs ${activePeriodLabel.toLowerCase()} sebelumnya`,
        icon: WalletCards,
        tone: "emerald" as KpiTone,
      },
      {
        label: "Order Selesai",
        value: analytics.kpis.completedOrders.toLocaleString("id-ID"),
        trend: analytics.kpis.orderTrend,
        helper: "pickup berhasil",
        icon: PackageCheck,
        tone: "blue" as KpiTone,
      },
      {
        label: "Food Saved",
        value: formatKgValue(analytics.kpis.foodSavedKg),
        trend: analytics.kpis.foodSavedTrend,
        helper: "estimasi makanan terselamatkan",
        icon: Leaf,
        tone: "amber" as KpiTone,
      },
    ];
  }, [activePeriodLabel, analytics]);
  const operationalKpis = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      {
        label: "Conversion Rate",
        value: formatPercentValue(analytics.kpis.conversionRate),
        trend: analytics.kpis.conversionTrend,
        helper: `${analytics.kpis.completedOrders} selesai dari ${analytics.kpis.totalOperationalOrders} order`,
        icon: Percent,
        tone: "purple" as KpiTone,
      },
      {
        label: "Refund Rate",
        value: formatPercentValue(analytics.kpis.refundRate),
        trend: analytics.kpis.refundTrend,
        helper: `${analytics.kpis.refundedOrders} order refund`,
        icon: RotateCcw,
        tone: "red" as KpiTone,
      },
      {
        label: "Repeat Customer",
        value: formatPercentValue(analytics.kpis.repeatCustomerRate),
        trend: analytics.kpis.repeatCustomerTrend,
        helper: `${analytics.kpis.repeatCustomers}/${analytics.kpis.uniqueCustomers} customer repeat`,
        icon: UsersRound,
        tone: "blue" as KpiTone,
      },
    ];
  }, [analytics]);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setIsLoading(true);
      setNotice(null);

      try {
        const response = await fetch(`/api/owner/analytics?days=${activePeriod}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as AnalyticsResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.message || "Analytics gagal dimuat.");
        }

        if (!ignore) {
          setData(result);
        }
      } catch (error) {
        if (!ignore) {
          setData(null);
          setNotice(
            error instanceof Error ? error.message : "Analytics gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [activePeriod]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/owner/analytics?days=${activePeriod}&format=csv`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Export laporan gagal.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `resqfood-owner-analytics-${activePeriod}d.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export laporan gagal.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-gray-900">
      <header className="flex flex-col gap-5 rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            Owner Analytics
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
            Performa Toko
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
            Semua angka diambil dari order, menu, rating, dan pickup restoran
            yang sedang login.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-fit">
          <div className="flex rounded-2xl border border-gray-100 bg-gray-50 p-1">
            {periodOptions.map((period) => {
              const isActive = activePeriod === period.days;

              return (
                <button
                  key={period.days}
                  type="button"
                  onClick={() => setActivePeriod(period.days)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all lg:flex-none ${
                    isActive
                      ? "bg-gray-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {period.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={isExporting || !analytics}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            <Download size={15} />
            {isExporting ? "Export..." : "Export CSV"}
          </button>
        </div>
      </header>

      {notice ? (
        <InlineNotice variant="error" description={notice} />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat analytics"
          description="Menghitung data toko dari database."
          variant="loading"
          className="rounded-[32px]"
        />
      ) : data?.restaurant === null ? (
        <StateCard
          title="Restoran belum aktif"
          description="Analytics akan tersedia setelah pendaftaran mitra disetujui admin."
          variant="empty"
          className="rounded-[32px]"
        />
      ) : analytics ? (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const tone = toneClassByKpiTone[kpi.tone];

              return (
                <article
                  key={kpi.label}
                  className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconWrapClassName}`}
                    >
                      <Icon size={23} className={tone.iconClassName} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${tone.trendClassName}`}
                    >
                      <ArrowUpRight
                        size={13}
                        className={getTrendIconClass(kpi.trend)}
                      />
                      {kpi.trend}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-500">{kpi.label}</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                    {kpi.value}
                  </h2>
                  <p className="mt-2 text-xs font-medium text-gray-400">
                    {kpi.helper}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {operationalKpis.map((kpi) => {
              const Icon = kpi.icon;
              const tone = toneClassByKpiTone[kpi.tone];

              return (
                <article
                  key={kpi.label}
                  className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconWrapClassName}`}
                    >
                      <Icon size={23} className={tone.iconClassName} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${tone.trendClassName}`}
                    >
                      <ArrowUpRight
                        size={13}
                        className={getTrendIconClass(kpi.trend)}
                      />
                      {kpi.trend}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-500">{kpi.label}</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                    {kpi.value}
                  </h2>
                  <p className="mt-2 text-xs font-medium text-gray-400">
                    {kpi.helper}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Pendapatan Periode
                  </h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Total order selesai dalam {activePeriodLabel.toLowerCase()} terakhir.
                  </p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-600">
                  <TrendingUp size={14} />
                  {analytics.peakLabel}
                </div>
              </div>

              <div className="flex h-72 items-end gap-3 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4">
                {analytics.revenue.map((item) => {
                  const height = Math.max(
                    8,
                    Math.round((item.value / maxRevenue) * 100),
                  );

                  return (
                    <div
                      key={item.day}
                      className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
                    >
                      <div className="flex flex-1 items-end">
                        <div
                          className="group relative w-full rounded-t-2xl bg-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.18)] transition-all hover:bg-emerald-400"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-12 left-1/2 hidden -translate-x-1/2 rounded-xl bg-gray-900 px-3 py-2 text-center text-[10px] font-bold whitespace-nowrap text-white shadow-lg group-hover:block">
                            {formatRp(item.value)}
                            <br />
                            <span className="font-medium text-gray-300">
                              {item.orders} order
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="truncate text-center text-xs font-extrabold text-gray-400">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[32px] border border-gray-100 bg-gray-900 p-6 text-white shadow-xl">
              <div className="mb-7 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">Dampak Food Rescue</h2>
                  <p className="mt-1 text-xs font-medium text-gray-400">
                    Estimasi dari jumlah item order selesai.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
                  <Leaf size={24} />
                </div>
              </div>

              <div className="mb-7">
                <p className="text-sm font-bold text-gray-400">
                  Makanan Terselamatkan
                </p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight">
                  {analytics.impact.savedKg}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-xs font-bold text-gray-400">
                    <span>{analytics.impact.targetLabel}</span>
                    <span>{analytics.impact.target}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${analytics.impact.target}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] font-bold text-gray-400">CO2e</p>
                    <p className="mt-1 text-lg font-extrabold">
                      {analytics.impact.co2e}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-[10px] font-bold text-gray-400">Porsi</p>
                    <p className="mt-1 text-lg font-extrabold">
                      {analytics.impact.portions}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Menu Terlaris
                  </h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Berdasarkan item dari order selesai.
                  </p>
                </div>
                <PieChart size={22} className="text-gray-400" />
              </div>

              <div className="space-y-4">
                {analytics.bestSellers.length === 0 ? (
                  <div className="rounded-[24px] bg-gray-50 p-5 text-center text-sm font-bold text-gray-500">
                    Belum ada menu terjual pada periode ini.
                  </div>
                ) : (
                  analytics.bestSellers.map((item, index) => (
                    <div key={item.name} className="rounded-[24px] bg-gray-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-gray-900 shadow-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-extrabold text-gray-950">
                              {item.name}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-gray-500">
                              {item.category}
                            </p>
                            <p className="mt-1 text-[10px] font-bold text-gray-400">
                              {item.orderCount} order • avg {formatRp(item.avgPrice)} • kontribusi {formatPercentValue(item.contributionRate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-600">
                            {item.sold}x
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">
                            {formatRp(item.revenue)}
                          </p>
                          <p className="text-[10px] font-bold text-red-400">
                            refund {item.refundCount}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${
                            bestsellerColors[index] ?? "bg-gray-400"
                          }`}
                          style={{ width: `${item.stockRate}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Jam Pickup Ramai
                  </h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Distribusi order selesai berdasarkan pickup time.
                  </p>
                </div>
                <BarChart3 size={22} className="text-gray-400" />
              </div>

              <div className="space-y-4">
                {analytics.pickupWindows.map((window) => (
                  <div key={window.time}>
                    <div className="mb-2 flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-500">{window.time}</span>
                      <span className="text-gray-950">
                        {window.orders} order • {formatPercentValue(window.share)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${window.value}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-gray-400">
                      Revenue {formatRp(window.revenue)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <ArrowDownRight size={20} className="mt-0.5 text-blue-600" />
                  <div>
                    <p className="text-sm font-extrabold text-blue-900">
                      Rekomendasi operasional
                    </p>
                    <p className="mt-1 text-xs leading-5 font-medium text-blue-700">
                      {analytics.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {analytics.insights.map((insight) => {
              const config = insightIconByType[insight.type];
              const Icon = config.icon;

              return (
                <article
                  key={insight.title}
                  className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${config.className}`}
                  >
                    <Icon size={21} />
                  </div>
                  <p className="text-xs font-bold text-gray-400">
                    {insight.title}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-gray-950">
                    {insight.value}
                  </h3>
                  <p className="mt-2 text-xs leading-5 font-medium text-gray-500">
                    {insight.description}
                  </p>
                </article>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}
