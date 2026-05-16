"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type NotificationType = "order" | "stock" | "wallet" | "review" | "system";
type FilterKey = "all" | "unread" | NotificationType;

type OwnerNotification = {
  id: number;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread: boolean;
  actionLabel: string;
  href: string;
};

const initialNotifications: OwnerNotification[] = [
  {
    id: 1,
    title: "Pesanan Baru Masuk",
    description: "Order SFM-99A2X menunggu konfirmasi dari restoran.",
    time: "2 menit lalu",
    type: "order",
    unread: true,
    actionLabel: "Buka Order",
    href: "/owner/orders/SFM-99A2X",
  },
  {
    id: 2,
    title: "Stok Hampir Habis",
    description: "Paket Roti Artisan tersisa 2 porsi untuk pickup malam ini.",
    time: "18 menit lalu",
    type: "stock",
    unread: true,
    actionLabel: "Kelola Menu",
    href: "/owner/menu",
  },
  {
    id: 3,
    title: "Saldo Siap Dicairkan",
    description: "Rp 1.250.000 sudah masuk ke wallet dan bisa dicairkan.",
    time: "42 menit lalu",
    type: "wallet",
    unread: true,
    actionLabel: "Buka Saldo",
    href: "/owner/wallet",
  },
  {
    id: 4,
    title: "Ulasan Baru",
    description: "Alfhin memberi rating 5 untuk Paket Roti Artisan.",
    time: "1 jam lalu",
    type: "review",
    unread: false,
    actionLabel: "Lihat Ulasan",
    href: "/owner/reviews",
  },
  {
    id: 5,
    title: "Sistem Pembayaran Normal",
    description: "Gateway pembayaran sudah kembali stabil setelah pemeliharaan.",
    time: "2 jam lalu",
    type: "system",
    unread: false,
    actionLabel: "Pengaturan",
    href: "/owner/settings",
  },
  {
    id: 6,
    title: "Pickup Selesai",
    description: "Customer sudah mengambil pesanan SFM-44F7U dari toko.",
    time: "Kemarin",
    type: "order",
    unread: false,
    actionLabel: "Daftar Order",
    href: "/owner/dashboard?tab=orders",
  },
];

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum Dibaca" },
  { key: "order", label: "Pesanan" },
  { key: "stock", label: "Stok" },
  { key: "wallet", label: "Saldo" },
  { key: "review", label: "Ulasan" },
  { key: "system", label: "Sistem" },
];

const notificationStyleByType: Record<
  NotificationType,
  {
    icon: LucideIcon;
    className: string;
    badgeClassName: string;
    label: string;
  }
> = {
  order: {
    icon: ShoppingBag,
    className: "bg-blue-50 text-blue-600",
    badgeClassName: "bg-blue-50 text-blue-700",
    label: "Pesanan",
  },
  stock: {
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-600",
    badgeClassName: "bg-amber-50 text-amber-700",
    label: "Stok",
  },
  wallet: {
    icon: WalletCards,
    className: "bg-emerald-50 text-emerald-600",
    badgeClassName: "bg-emerald-50 text-emerald-700",
    label: "Saldo",
  },
  review: {
    icon: Star,
    className: "bg-purple-50 text-purple-600",
    badgeClassName: "bg-purple-50 text-purple-700",
    label: "Ulasan",
  },
  system: {
    icon: CheckCircle2,
    className: "bg-gray-100 text-gray-600",
    badgeClassName: "bg-gray-100 text-gray-600",
    label: "Sistem",
  },
};

export default function OwnerNotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length;
  const urgentCount = notifications.filter(
    (notification) =>
      notification.unread &&
      (notification.type === "order" || notification.type === "stock"),
  ).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }

    if (activeFilter === "unread") {
      return notifications.filter((notification) => notification.unread);
    }

    return notifications.filter(
      (notification) => notification.type === activeFilter,
    );
  }, [activeFilter, notifications]);

  const markAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
  };

  const markAsRead = (notificationId: number) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              unread: false,
            }
          : notification,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-gray-900">
      <section className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5 border-b border-gray-100 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
              Owner Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
              Pusat Notifikasi
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
              Pantau order baru, stok menipis, saldo, ulasan, dan status sistem
              dari satu tempat.
            </p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-extrabold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300"
          >
            <CheckCircle2 size={17} />
            Tandai Semua Dibaca
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-gray-100 p-6 md:grid-cols-3">
          <div className="rounded-[24px] bg-emerald-50 p-5">
            <Bell size={22} className="mb-4 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-700">Belum Dibaca</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-900">
              {unreadCount}
            </p>
          </div>
          <div className="rounded-[24px] bg-red-50 p-5">
            <AlertCircle size={22} className="mb-4 text-red-600" />
            <p className="text-sm font-bold text-red-700">Prioritas</p>
            <p className="mt-1 text-3xl font-extrabold text-red-900">
              {urgentCount}
            </p>
          </div>
          <div className="rounded-[24px] bg-blue-50 p-5">
            <PackageCheck size={22} className="mb-4 text-blue-600" />
            <p className="text-sm font-bold text-blue-700">Order Aktif</p>
            <p className="mt-1 text-3xl font-extrabold text-blue-900">3</p>
          </div>
        </div>

        <div className="border-b border-gray-100 p-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-5">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const style = notificationStyleByType[notification.type];
              const Icon = style.icon;

              return (
                <article
                  key={notification.id}
                  className={`rounded-[24px] border p-5 transition-colors ${
                    notification.unread
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.className}`}
                      >
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${style.badgeClassName}`}
                          >
                            {style.label}
                          </span>
                          {notification.unread ? (
                            <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-extrabold text-white">
                              Baru
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
                            <Clock3 size={13} />
                            {notification.time}
                          </span>
                        </div>
                        <h2 className="text-sm font-extrabold text-gray-950">
                          {notification.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                          {notification.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        disabled={!notification.unread}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                      >
                        {notification.unread ? "Tandai Dibaca" : "Dibaca"}
                      </button>
                      <Link
                        href={notification.href}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                      >
                        {notification.actionLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <UtensilsCrossed size={34} className="mx-auto mb-3 text-gray-400" />
              <h2 className="text-sm font-extrabold text-gray-950">
                Tidak ada notifikasi
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-medium text-gray-500">
                Filter ini belum memiliki notifikasi. Coba kategori lain.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
