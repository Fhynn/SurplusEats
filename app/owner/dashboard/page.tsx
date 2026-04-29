"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Coffee,
  LayoutDashboard,
  Leaf,
  PackageCheck,
  PackagePlus,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { OwnerMenuManagement } from "@/components/owner-menu-management";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const stats = [
  {
    label: "Pendapatan Hari Ini",
    value: formatRp(345000),
    icon: TrendingUp,
    iconWrapClassName: "bg-emerald-50",
    iconClassName: "text-emerald-500",
    trend: "+12.5%",
  },
  {
    label: "Pesanan Masuk",
    value: "14",
    icon: ShoppingBag,
    iconWrapClassName: "bg-blue-50",
    iconClassName: "text-blue-500",
    trend: "+2",
  },
  {
    label: "Menu Surplus Aktif",
    value: "8",
    icon: UtensilsCrossed,
    iconWrapClassName: "bg-amber-50",
    iconClassName: "text-amber-500",
    trend: "0",
  },
  {
    label: "Food Waste Diselamatkan",
    value: "4.2 Kg",
    icon: Leaf,
    iconWrapClassName: "bg-emerald-50",
    iconClassName: "text-emerald-500",
    trend: "+1.2 Kg",
  },
] as const;

const recentOrders = [
  {
    id: "SFM-99A2X",
    customer: "Alfhin",
    items: "1x Roti Sourdough, 2x Croissant",
    total: 45000,
    status: "pending",
    time: "18:30",
  },
  {
    id: "SFM-88B1Y",
    customer: "Budi Santoso",
    items: "2x Nasi Ayam Bakar",
    total: 24000,
    status: "preparing",
    time: "18:15",
  },
  {
    id: "SFM-77C0Z",
    customer: "Siti Aminah",
    items: "1x Assorted Sushi",
    total: 35000,
    status: "ready",
    time: "18:00",
  },
  {
    id: "SFM-66D9W",
    customer: "Dina Lorenza",
    items: "3x Donut Coklat",
    total: 15000,
    status: "completed",
    time: "17:45",
  },
] as const;

type OwnerTab = "dashboard" | "orders" | "menu";

type OrderStatus = "new" | "preparing" | "ready" | "completed";

type KanbanOrder = {
  id: string;
  time: string;
  customer: string;
  items: string[];
  note?: string;
  total: number;
  status: OrderStatus;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: undefined },
  { id: "orders", label: "Pesanan", icon: ShoppingBag, badge: "3 Baru" },
  { id: "menu", label: "Kelola Menu", icon: UtensilsCrossed, badge: undefined },
] as const;

const initialKanbanOrders: KanbanOrder[] = [
  {
    id: "SFM-99A2X",
    time: "18:30",
    customer: "Alfhin Pratama",
    items: ["1x Roti Sourdough", "2x Croissant Butter"],
    note: "Tolong pisahkan roti manis dan asin.",
    total: 45000,
    status: "new",
  },
  {
    id: "SFM-88B1Y",
    time: "18:18",
    customer: "Budi Santoso",
    items: ["2x Nasi Ayam Bakar", "1x Es Teh"],
    total: 24000,
    status: "new",
  },
  {
    id: "SFM-77C0Z",
    time: "18:02",
    customer: "Siti Aminah",
    items: ["1x Assorted Sushi", "1x Miso Soup"],
    note: "Pickup atas nama Siti, nomor belakang 7721.",
    total: 35000,
    status: "preparing",
  },
  {
    id: "SFM-66D9W",
    time: "17:47",
    customer: "Dina Lorenza",
    items: ["3x Donut Cokelat", "1x Cinnamon Roll"],
    total: 15000,
    status: "preparing",
  },
  {
    id: "SFM-55E8V",
    time: "17:20",
    customer: "Kevin Ardi",
    items: ["1x Salad Bowl", "1x Cold Brew Latte"],
    total: 33000,
    status: "ready",
  },
  {
    id: "SFM-44F7U",
    time: "16:55",
    customer: "Maya Lestari",
    items: ["2x Paket Roti Artisan"],
    total: 30000,
    status: "completed",
  },
];

const orderColumns = [
  {
    id: "new",
    title: "Pesanan Baru",
    icon: PackagePlus,
    accentClassName: "bg-amber-100 text-amber-600 ring-amber-200",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
  {
    id: "preparing",
    title: "Sedang Disiapkan",
    icon: ChefHat,
    accentClassName: "bg-blue-100 text-blue-600 ring-blue-200",
    badgeClassName: "bg-blue-100 text-blue-700",
  },
  {
    id: "ready",
    title: "Siap Diambil",
    icon: Coffee,
    accentClassName: "bg-purple-100 text-purple-600 ring-purple-200",
    badgeClassName: "bg-purple-100 text-purple-700",
  },
  {
    id: "completed",
    title: "Selesai",
    icon: PackageCheck,
    accentClassName: "bg-emerald-100 text-emerald-600 ring-emerald-200",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
] as const satisfies readonly {
  id: OrderStatus;
  title: string;
  icon: typeof PackagePlus;
  accentClassName: string;
  badgeClassName: string;
}[];

const nextStatusByStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "ready",
  ready: "completed",
};

function getStatusBadge(status: (typeof recentOrders)[number]["status"]) {
  switch (status) {
    case "pending":
      return (
        <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          Perlu Konfirmasi
        </span>
      );
    case "preparing":
      return (
        <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
          Disiapkan
        </span>
      );
    case "ready":
      return (
        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          Siap Diambil
        </span>
      );
    case "completed":
      return (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
          Selesai
        </span>
      );
    default:
      return null;
  }
}

function OrderCard({
  order,
  onAdvance,
  onReject,
}: {
  order: KanbanOrder;
  onAdvance: (orderId: string) => void;
  onReject: (orderId: string) => void;
}) {
  return (
    <article className="group rounded-[24px] border border-transparent bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all hover:border-emerald-100 hover:shadow-[0_12px_32px_rgba(15,23,42,0.07)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-extrabold text-gray-400">
          {order.id}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-600">
          <Clock size={13} />
          {order.time}
        </span>
      </div>

      <h3 className="text-base font-extrabold tracking-tight text-gray-950">
        {order.customer}
      </h3>

      <ul className="mt-3 space-y-2">
        {order.items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-5 font-semibold text-gray-500"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {order.note ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="flex gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-sm leading-5 font-semibold text-amber-800 italic">
              {order.note}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
          Total
        </span>
        <span className="text-base font-extrabold text-emerald-600">
          {formatRp(order.total)}
        </span>
      </div>

      <div className="mt-5">
        {order.status === "new" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onReject(order.id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
            >
              <X size={16} />
              Tolak
            </button>
            <button
              type="button"
              onClick={() => onAdvance(order.id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
            >
              <Check size={16} />
              Terima Order
            </button>
          </div>
        ) : null}

        {order.status === "preparing" ? (
          <button
            type="button"
            onClick={() => onAdvance(order.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(59,130,246,0.22)] transition-colors hover:bg-blue-600"
          >
            <PackageCheck size={17} />
            Tandai Siap Diambil
          </button>
        ) : null}

        {order.status === "ready" ? (
          <button
            type="button"
            onClick={() => onAdvance(order.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(17,24,39,0.18)] transition-colors hover:bg-emerald-500"
          >
            <ShoppingBag size={17} />
            Konfirmasi Pickup
          </button>
        ) : null}

        {order.status === "completed" ? (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-400"
          >
            <CheckCircle2 size={17} />
            Selesai
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState<OwnerTab>("dashboard");
  const [orders, setOrders] = useState<KanbanOrder[]>(initialKanbanOrders);

  const ordersByStatus = useMemo(() => {
    return orderColumns.reduce(
      (groupedOrders, column) => ({
        ...groupedOrders,
        [column.id]: orders.filter((order) => order.status === column.id),
      }),
      {} as Record<OrderStatus, KanbanOrder[]>,
    );
  }, [orders]);

  const handleAdvanceOrder = (orderId: string) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        const nextStatus = nextStatusByStatus[order.status];

        if (order.id !== orderId || !nextStatus) {
          return order;
        }

        return {
          ...order,
          status: nextStatus,
        };
      }),
    );
  };

  const handleRejectOrder = (orderId: string) => {
    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.id !== orderId),
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-plus-jakarta-sans)] selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:flex">
          <div className="border-b border-gray-50 p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500 p-2">
                <Store size={20} className="text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Surplus<span className="text-emerald-500">Owner</span>
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 p-4">
            <p className="mt-4 mb-3 px-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
              Menu Utama
            </p>

            {navItems.map(({ id, label, icon: Icon, badge }) => {
              const isActive = activeTab === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center ${
                    badge ? "justify-between" : "gap-3"
                  } rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.1)]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={20}
                      className={isActive ? "text-emerald-500" : "text-gray-400"}
                    />
                    {label}
                  </span>

                  {badge ? (
                    <span className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-gray-50 p-4">
            <Link
              href="/owner/settings"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <Settings size={20} className="text-gray-400" />
              Pengaturan Restoran
            </Link>
          </div>
        </aside>

        <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="relative hidden w-96 md:block">
              <Search
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari order ID atau menu..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-12 text-sm font-medium text-gray-900 transition-all outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="ml-auto flex items-center gap-4">
              <Link
                href="/owner/notifications"
                className="relative rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-50"
              >
                <Bell size={20} />
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
              </Link>
              <div className="h-8 w-px bg-gray-200" />
              <div className="group flex cursor-pointer items-center gap-3">
                <div className="hidden text-right md:block">
                  <p className="text-sm leading-tight font-extrabold text-gray-900">
                    Bakehouse Bakery
                  </p>
                  <p className="text-xs font-medium text-gray-500">Owner</p>
                </div>
                <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-transparent bg-emerald-100 transition-all group-hover:border-emerald-500">
                  <Image
                    src="https://images.unsplash.com/photo-1583338917451-face2751d8d5?q=80&w=150&auto=format&fit=crop"
                    alt="Shop avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </header>

          <div
            className={`flex-1 bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              activeTab === "orders"
                ? "min-h-0 overflow-hidden p-0"
                : "overflow-y-auto p-8"
            }`}
          >
            <div className={activeTab === "orders" ? "h-full" : "mx-auto max-w-7xl"}>
              {activeTab === "dashboard" ? (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Halo, Bakehouse Bakery! 👋
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <CheckCircle2
                          size={14}
                          className="text-emerald-500"
                        />
                        Restoran Terverifikasi
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 self-start rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-600 active:scale-95"
                    >
                      <Plus size={18} />
                      Tambah Makanan
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => {
                      const Icon = stat.icon;

                      return (
                        <div
                          key={stat.label}
                          className="group relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_15px_rgba(0,0,0,0.03)] transition-colors hover:border-emerald-200"
                        >
                          <div
                            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] ${stat.iconWrapClassName}`}
                          >
                            <Icon size={24} className={stat.iconClassName} />
                          </div>
                          <p className="mb-1 text-sm font-bold text-gray-500">
                            {stat.label}
                          </p>
                          <h3 className="text-2xl font-extrabold tracking-tight text-gray-900">
                            {stat.value}
                          </h3>
                          <div className="absolute top-6 right-6 flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                            <ArrowUpRight size={12} className="mr-0.5" />
                            {stat.trend}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-6">
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Pesanan Terbaru
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("orders")}
                        className="text-sm font-bold text-emerald-600 hover:underline"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-bold tracking-wider text-gray-400 uppercase">
                            <th className="p-5">Order ID</th>
                            <th className="p-5">Customer & Items</th>
                            <th className="p-5">Waktu</th>
                            <th className="p-5">Total</th>
                            <th className="p-5">Status</th>
                            <th className="p-5">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {recentOrders.map((order) => (
                            <tr
                              key={order.id}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="p-5 font-mono text-sm font-bold text-gray-900">
                                {order.id}
                              </td>
                              <td className="p-5">
                                <p className="text-sm font-bold text-gray-900">
                                  {order.customer}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {order.items}
                                </p>
                              </td>
                              <td className="p-5">
                                <span className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                                  <Clock size={14} />
                                  {order.time}
                                </span>
                              </td>
                              <td className="p-5 text-sm font-extrabold text-emerald-600">
                                {formatRp(order.total)}
                              </td>
                              <td className="p-5">{getStatusBadge(order.status)}</td>
                              <td className="p-5">
                                {order.status === "pending" ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
                                      title="Terima"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-xl bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-500 hover:text-white"
                                      title="Tolak"
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                ) : null}

                                {order.status === "preparing" ? (
                                  <button
                                    type="button"
                                    className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                                  >
                                    Tandai Siap
                                  </button>
                                ) : null}

                                {order.status === "ready" ? (
                                  <button
                                    type="button"
                                    className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-600"
                                  >
                                    Konfirmasi Pickup
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "menu" ? (
                <OwnerMenuManagement />
              ) : null}

              {activeTab === "orders" ? (
                <div className="flex h-full flex-col overflow-hidden bg-[#f8fafc] px-8 py-6">
                  <div className="mb-5 flex shrink-0 flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-emerald-600">
                        Manajemen Pesanan
                      </p>
                      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                        Papan Kanban Order
                      </h2>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">
                      <ShoppingBag size={16} className="text-emerald-500" />
                      {orders.length} pesanan aktif
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
                    <div className="flex h-full min-w-max gap-5">
                      {orderColumns.map((column) => {
                        const Icon = column.icon;
                        const columnOrders = ordersByStatus[column.id];

                        return (
                          <section
                            key={column.id}
                            className="flex h-full min-w-[300px] max-w-[340px] flex-1 flex-col rounded-[32px] border border-white/80 bg-gray-50/50 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
                          >
                            <div className="mb-4 flex shrink-0 items-center justify-between gap-3 px-1">
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${column.accentClassName}`}
                                >
                                  <Icon size={20} />
                                </div>
                                <h3 className="truncate text-base font-extrabold text-gray-950">
                                  {column.title}
                                </h3>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${column.badgeClassName}`}
                              >
                                {columnOrders.length}
                              </span>
                            </div>

                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              {columnOrders.length > 0 ? (
                                columnOrders.map((order) => (
                                  <OrderCard
                                    key={order.id}
                                    order={order}
                                    onAdvance={handleAdvanceOrder}
                                    onReject={handleRejectOrder}
                                  />
                                ))
                              ) : (
                                <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white/70 p-5 text-center">
                                  <p className="text-sm font-bold text-gray-400">
                                    Belum ada pesanan di kolom ini.
                                  </p>
                                </div>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
