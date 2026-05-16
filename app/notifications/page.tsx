"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Gift,
  MailCheck,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type NotificationType = "order" | "promo" | "refund" | "system";
type NotificationFilter = "all" | "unread" | NotificationType;

type CustomerNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread: boolean;
  href?: string;
};

type ApiNotification = {
  id: string;
  title: string;
  body: string;
  type: "ORDER" | "PROMO" | "REFUND" | "SYSTEM";
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const notificationStyleByType = {
  order: {
    icon: ShoppingBag,
    className: "bg-emerald-50 text-emerald-600",
  },
  promo: {
    icon: Gift,
    className: "bg-amber-50 text-amber-600",
  },
  refund: {
    icon: RefreshCcw,
    className: "bg-blue-50 text-blue-600",
  },
  system: {
    icon: ReceiptText,
    className: "bg-purple-50 text-purple-600",
  },
} as const;

const notificationFilters: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum Dibaca" },
  { key: "order", label: "Order" },
  { key: "promo", label: "Promo" },
  { key: "refund", label: "Refund" },
  { key: "system", label: "Sistem" },
];

const notificationTypeLabel: Record<NotificationType, string> = {
  order: "Order",
  promo: "Promo",
  refund: "Refund",
  system: "Sistem",
};

const apiTypeToUiType: Record<ApiNotification["type"], NotificationType> = {
  ORDER: "order",
  PROMO: "promo",
  REFUND: "refund",
  SYSTEM: "system",
};

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 2) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours} jam lalu`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function apiNotificationToUi(notification: ApiNotification): CustomerNotification {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.body,
    time: relativeTime(notification.createdAt),
    type: apiTypeToUiType[notification.type],
    unread: !notification.readAt,
    href: notification.href || undefined,
  };
}

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      setIsLoadingNotifications(true);

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const result = (await response.json()) as {
          ok: boolean;
          notifications?: ApiNotification[];
        };

        if (!ignore) {
          setNotifications(
            result.notifications?.map(apiNotificationToUi) ?? [],
          );
        }
      } catch {
        if (!ignore) {
          setNotifications([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingNotifications(false);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);
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
  const filterCounts = useMemo(() => {
    return notificationFilters.reduce(
      (counts, filter) => ({
        ...counts,
        [filter.key]:
          filter.key === "all"
            ? notifications.length
            : filter.key === "unread"
              ? unreadCount
              : notifications.filter(
                  (notification) => notification.type === filter.key,
                ).length,
      }),
      {} as Record<NotificationFilter, number>,
    );
  }, [notifications, unreadCount]);

  const markAllAsRead = async () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, unread: false }
          : notification,
      ),
    );
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId }),
    });
  };

  const removeNotification = async (notificationId: string) => {
    setNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) => notification.id !== notificationId,
      ),
    );
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notificationId }),
    });
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 rounded-b-[32px] bg-white px-6 pt-10 pb-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeft size={24} className="text-gray-800" />
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">
                  Notifikasi
                </h1>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {unreadCount > 0
                    ? `${unreadCount} belum dibaca`
                    : "Semua sudah dibaca"}
                </p>
              </div>
            </div>

            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Bell size={21} />
              {unreadCount > 0 ? (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-3 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <CheckCircle2 size={17} />
            Tandai Semua Dibaca
          </button>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {notificationFilters.map((filter) => {
              const isActive = activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`shrink-0 rounded-2xl px-3.5 py-2 text-xs font-extrabold transition-colors ${
                    isActive
                      ? "bg-gray-950 text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-white/15 text-white" : "bg-white text-gray-400"
                    }`}
                  >
                    {filterCounts[filter.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wide text-gray-900">
              Hari Ini
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-gray-400 shadow-sm">
              <Clock size={12} />
              Live update
            </span>
          </div>

          <section className="space-y-3">
            {isLoadingNotifications ? (
              <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center shadow-sm">
                <h3 className="text-base font-extrabold text-gray-950">
                  Memuat notifikasi...
                </h3>
                <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 font-medium text-gray-500">
                  Notifikasi diambil sesuai session akun yang sedang login.
                </p>
              </div>
            ) : null}

            {filteredNotifications.map((notification) => {
              const style = notificationStyleByType[notification.type];
              const Icon = style.icon;

              return (
                <article
                  key={notification.id}
                  className={`rounded-[24px] border p-4 shadow-sm transition-all ${
                    notification.unread
                      ? "border-emerald-200 bg-white shadow-[0_10px_24px_rgba(16,185,129,0.06)]"
                      : "border-gray-100 bg-white/80"
                  }`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.className}`}
                    >
                      <Icon size={21} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                              {notificationTypeLabel[notification.type]}
                            </span>
                            {notification.unread ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                                Baru
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-sm font-extrabold text-gray-950">
                            {notification.title}
                          </h3>
                        </div>
                        {notification.unread ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        ) : null}
                      </div>
                      <p className="text-xs leading-5 font-medium text-gray-500">
                        {notification.description}
                      </p>
                      <p className="mt-3 text-[10px] font-bold text-gray-400">
                        {notification.time}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => void markAsRead(notification.id)}
                        className="flex min-h-10 items-center justify-center rounded-xl bg-gray-900 px-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500"
                      >
                        Buka Detail
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification.id)}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-200"
                        disabled={!notification.unread}
                      >
                        <MailCheck size={14} />
                        {notification.unread ? "Tandai Dibaca" : "Dibaca"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void removeNotification(notification.id)}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-extrabold text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </article>
              );
            })}

            {!isLoadingNotifications && filteredNotifications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                  <Bell size={24} />
                </div>
                <h3 className="text-base font-extrabold text-gray-950">
                  Tidak ada notifikasi
                </h3>
                <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 font-medium text-gray-500">
                  Ubah filter atau tunggu update terbaru dari order, promo, dan
                  refund.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
