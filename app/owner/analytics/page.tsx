"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Leaf,
  PackageCheck,
  PieChart,
  Star,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const periodOptions = ["7 Hari", "30 Hari", "90 Hari"] as const;

type PeriodOption = (typeof periodOptions)[number];
type KpiTone = "emerald" | "blue" | "amber";

type AnalyticsData = {
  kpis: {
    label: string;
    value: string;
    trend: string;
    helper: string;
    icon: LucideIcon;
    tone: KpiTone;
  }[];
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
    className: string;
  }[];
  pickupWindows: {
    time: string;
    value: number;
  }[];
  recommendation: string;
  peakLabel: string;
  insights: {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    className: string;
  }[];
};

const analyticsByPeriod: Record<PeriodOption, AnalyticsData> = {
  "7 Hari": {
    kpis: [
      {
        label: "Pendapatan Bersih",
        value: formatRp(3450000),
        trend: "+18.4%",
        helper: "vs 7 hari sebelumnya",
        icon: WalletCards,
        tone: "emerald",
      },
      {
        label: "Order Selesai",
        value: "286",
        trend: "+12.1%",
        helper: "pickup berhasil",
        icon: PackageCheck,
        tone: "blue",
      },
      {
        label: "Food Saved",
        value: "42.8 Kg",
        trend: "+9.6%",
        helper: "estimasi makanan terselamatkan",
        icon: Leaf,
        tone: "amber",
      },
    ],
    revenue: [
      { day: "Sen", value: 420000, orders: 31 },
      { day: "Sel", value: 520000, orders: 42 },
      { day: "Rab", value: 380000, orders: 28 },
      { day: "Kam", value: 610000, orders: 49 },
      { day: "Jum", value: 720000, orders: 57 },
      { day: "Sab", value: 810000, orders: 64 },
      { day: "Min", value: 670000, orders: 52 },
    ],
    impact: {
      savedKg: "42.8 Kg",
      target: 76,
      targetLabel: "Target mingguan",
      co2e: "91 Kg",
      portions: "214",
    },
    bestSellers: [
      {
        name: "Paket Roti Artisan",
        category: "Roti & Pastry",
        sold: 86,
        revenue: 1290000,
        stockRate: 92,
        className: "bg-emerald-500",
      },
      {
        name: "Croissant Butter Box",
        category: "Roti & Pastry",
        sold: 61,
        revenue: 915000,
        stockRate: 78,
        className: "bg-blue-500",
      },
      {
        name: "Donut Cokelat",
        category: "Snack",
        sold: 42,
        revenue: 420000,
        stockRate: 54,
        className: "bg-amber-400",
      },
    ],
    pickupWindows: [
      { time: "17:00", value: 34 },
      { time: "18:00", value: 68 },
      { time: "19:00", value: 92 },
      { time: "20:00", value: 74 },
      { time: "21:00", value: 46 },
    ],
    recommendation:
      "Siapkan staf pickup ekstra pada jam 19:00 - 20:00 untuk mengurangi antrean pelanggan.",
    peakLabel: "Peak Sabtu",
    insights: [
      {
        title: "Jam terbaik untuk publish menu",
        value: "16:30 - 17:30",
        description:
          "Order meningkat 23% saat menu muncul sebelum jam pulang kerja.",
        icon: Clock3,
        className: "bg-blue-50 text-blue-600",
      },
      {
        title: "Rating toko stabil",
        value: "4.8 / 5.0",
        description: "Keluhan pickup rendah dan kualitas produk konsisten.",
        icon: Star,
        className: "bg-amber-50 text-amber-600",
      },
      {
        title: "Menu perlu ditambah",
        value: "Roti Manis",
        description:
          "Kategori pastry manis paling cepat habis dalam 7 hari terakhir.",
        icon: UtensilsCrossed,
        className: "bg-purple-50 text-purple-600",
      },
    ],
  },
  "30 Hari": {
    kpis: [
      {
        label: "Pendapatan Bersih",
        value: formatRp(12850000),
        trend: "+21.7%",
        helper: "vs 30 hari sebelumnya",
        icon: WalletCards,
        tone: "emerald",
      },
      {
        label: "Order Selesai",
        value: "1.048",
        trend: "+16.2%",
        helper: "pickup berhasil",
        icon: PackageCheck,
        tone: "blue",
      },
      {
        label: "Food Saved",
        value: "168.4 Kg",
        trend: "+14.9%",
        helper: "estimasi makanan terselamatkan",
        icon: Leaf,
        tone: "amber",
      },
    ],
    revenue: [
      { day: "P1", value: 1420000, orders: 118 },
      { day: "P2", value: 1640000, orders: 136 },
      { day: "P3", value: 1510000, orders: 124 },
      { day: "P4", value: 1830000, orders: 151 },
      { day: "P5", value: 1970000, orders: 166 },
      { day: "P6", value: 2250000, orders: 184 },
      { day: "P7", value: 2230000, orders: 169 },
    ],
    impact: {
      savedKg: "168.4 Kg",
      target: 84,
      targetLabel: "Target bulanan",
      co2e: "358 Kg",
      portions: "842",
    },
    bestSellers: [
      {
        name: "Paket Roti Artisan",
        category: "Roti & Pastry",
        sold: 318,
        revenue: 4770000,
        stockRate: 94,
        className: "bg-emerald-500",
      },
      {
        name: "Croissant Butter Box",
        category: "Roti & Pastry",
        sold: 246,
        revenue: 3690000,
        stockRate: 82,
        className: "bg-blue-500",
      },
      {
        name: "Rice Bowl Surprise",
        category: "Meal Box",
        sold: 188,
        revenue: 2256000,
        stockRate: 68,
        className: "bg-rose-400",
      },
    ],
    pickupWindows: [
      { time: "17:00", value: 39 },
      { time: "18:00", value: 72 },
      { time: "19:00", value: 96 },
      { time: "20:00", value: 81 },
      { time: "21:00", value: 52 },
    ],
    recommendation:
      "Tambah slot pickup 18:30 dan 19:30 agar lonjakan order tidak menumpuk di satu waktu.",
    peakLabel: "Peak 19:00",
    insights: [
      {
        title: "Momentum order tertinggi",
        value: "Jumat - Sabtu",
        description:
          "Order akhir pekan menyumbang 34% dari total transaksi 30 hari.",
        icon: Clock3,
        className: "bg-blue-50 text-blue-600",
      },
      {
        title: "Rating toko stabil",
        value: "4.8 / 5.0",
        description: "Konsistensi packing dan pickup menjaga keluhan tetap rendah.",
        icon: Star,
        className: "bg-amber-50 text-amber-600",
      },
      {
        title: "Menu perlu diprioritaskan",
        value: "Croissant Box",
        description:
          "Stok sering habis sebelum jam 19:00 saat periode ramai.",
        icon: UtensilsCrossed,
        className: "bg-purple-50 text-purple-600",
      },
    ],
  },
  "90 Hari": {
    kpis: [
      {
        label: "Pendapatan Bersih",
        value: formatRp(38600000),
        trend: "+27.4%",
        helper: "vs 90 hari sebelumnya",
        icon: WalletCards,
        tone: "emerald",
      },
      {
        label: "Order Selesai",
        value: "3.184",
        trend: "+20.8%",
        helper: "pickup berhasil",
        icon: PackageCheck,
        tone: "blue",
      },
      {
        label: "Food Saved",
        value: "512.7 Kg",
        trend: "+19.3%",
        helper: "estimasi makanan terselamatkan",
        icon: Leaf,
        tone: "amber",
      },
    ],
    revenue: [
      { day: "P1", value: 4280000, orders: 346 },
      { day: "P2", value: 4760000, orders: 389 },
      { day: "P3", value: 5020000, orders: 413 },
      { day: "P4", value: 5480000, orders: 451 },
      { day: "P5", value: 5770000, orders: 473 },
      { day: "P6", value: 6480000, orders: 532 },
      { day: "P7", value: 6810000, orders: 580 },
    ],
    impact: {
      savedKg: "512.7 Kg",
      target: 92,
      targetLabel: "Target kuartal",
      co2e: "1.09 Ton",
      portions: "2.563",
    },
    bestSellers: [
      {
        name: "Paket Roti Artisan",
        category: "Roti & Pastry",
        sold: 962,
        revenue: 14430000,
        stockRate: 96,
        className: "bg-emerald-500",
      },
      {
        name: "Rice Bowl Surprise",
        category: "Meal Box",
        sold: 684,
        revenue: 8208000,
        stockRate: 86,
        className: "bg-rose-400",
      },
      {
        name: "Croissant Butter Box",
        category: "Roti & Pastry",
        sold: 651,
        revenue: 9765000,
        stockRate: 79,
        className: "bg-blue-500",
      },
    ],
    pickupWindows: [
      { time: "17:00", value: 42 },
      { time: "18:00", value: 77 },
      { time: "19:00", value: 98 },
      { time: "20:00", value: 84 },
      { time: "21:00", value: 57 },
    ],
    recommendation:
      "Jaga stok paket roti sebagai anchor menu dan siapkan batch kedua untuk jam 19:00.",
    peakLabel: "Peak periode P7",
    insights: [
      {
        title: "Pertumbuhan paling kuat",
        value: "Meal Box",
        description:
          "Kategori meal box tumbuh konsisten dan mulai menyalip snack ringan.",
        icon: Clock3,
        className: "bg-blue-50 text-blue-600",
      },
      {
        title: "Kualitas operasional",
        value: "96% Pickup",
        description: "Sebagian besar order selesai tanpa refund atau pembatalan.",
        icon: Star,
        className: "bg-amber-50 text-amber-600",
      },
      {
        title: "Peluang menu baru",
        value: "Family Pack",
        description:
          "Basket besar meningkat, cocok untuk paket hemat menjelang malam.",
        icon: UtensilsCrossed,
        className: "bg-purple-50 text-purple-600",
      },
    ],
  },
};

const toneClassByKpiTone = {
  emerald: {
    iconWrapClassName: "bg-emerald-50",
    iconClassName: "text-emerald-600",
    trendClassName: "bg-emerald-50 text-emerald-600",
  },
  blue: {
    iconWrapClassName: "bg-blue-50",
    iconClassName: "text-blue-600",
    trendClassName: "bg-blue-50 text-blue-600",
  },
  amber: {
    iconWrapClassName: "bg-amber-50",
    iconClassName: "text-amber-600",
    trendClassName: "bg-amber-50 text-amber-600",
  },
} as const;

export default function OwnerAnalyticsPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodOption>("7 Hari");
  const analytics = analyticsByPeriod[activePeriod];
  const maxRevenue = Math.max(...analytics.revenue.map((item) => item.value));

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-gray-900">
      <header className="flex flex-col gap-5 rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            Owner Analytics
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
            Performa Toko
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
            Pantau pendapatan, menu terlaris, jam pickup ramai, dan dampak food
            rescue toko dalam satu tempat.
          </p>
        </div>

        <div className="flex w-full rounded-2xl border border-gray-100 bg-gray-50 p-1 lg:w-fit">
          {periodOptions.map((period) => {
            const isActive = activePeriod === period;

            return (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all lg:flex-none ${
                  isActive
                    ? "bg-gray-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {period}
              </button>
            );
          })}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {analytics.kpis.map((kpi) => {
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
                  <ArrowUpRight size={13} />
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
                Total transaksi sukses dalam {activePeriod.toLowerCase()} terakhir.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-600">
              <TrendingUp size={14} />
              {analytics.peakLabel}
            </div>
          </div>

          <div className="flex h-72 items-end gap-3 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4">
            {analytics.revenue.map((item) => {
              const height = Math.max(16, Math.round((item.value / maxRevenue) * 100));

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
                Estimasi kontribusi {activePeriod.toLowerCase()} terakhir.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
              <Leaf size={24} />
            </div>
          </div>

          <div className="mb-7">
            <p className="text-sm font-bold text-gray-400">Makanan Terselamatkan</p>
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
                Berdasarkan jumlah unit terjual.
              </p>
            </div>
            <PieChart size={22} className="text-gray-400" />
          </div>

          <div className="space-y-4">
            {analytics.bestSellers.map((item, index) => (
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
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-600">
                      {item.sold}x
                    </p>
                    <p className="text-[10px] font-bold text-gray-400">
                      {formatRp(item.revenue)}
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${item.className}`}
                    style={{ width: `${item.stockRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Jam Pickup Ramai
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Distribusi order yang diambil pelanggan.
              </p>
            </div>
            <BarChart3 size={22} className="text-gray-400" />
          </div>

          <div className="space-y-4">
            {analytics.pickupWindows.map((window) => (
              <div key={window.time}>
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-500">{window.time}</span>
                  <span className="text-gray-950">{window.value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${window.value}%` }}
                  />
                </div>
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
          const Icon = insight.icon;

          return (
            <article
              key={insight.title}
              className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${insight.className}`}
              >
                <Icon size={21} />
              </div>
              <p className="text-xs font-bold text-gray-400">{insight.title}</p>
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
    </div>
  );
}
