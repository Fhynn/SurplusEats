"use client";

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  PackageCheck,
  ShoppingBag,
  Star,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { StateCard } from "@/components/ui-state";
import {
  NotificationCard,
  NotificationCenterHeader,
  NotificationFilterTabs,
  NotificationListHeading,
  type NotificationTone,
} from "@/components/notification-center-ui";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import { emitUnreadNotificationsChanged } from "@/components/use-unread-notification-count";

type NotificationType = "order" | "stock" | "wallet" | "review" | "system";
type FilterKey = "all" | "unread" | NotificationType;

type OwnerNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread: boolean;
  actionLabel: string;
  href: string;
};

type ApiNotification = {
  id: string;
  type: "ORDER" | "PROMO" | "REFUND" | "SYSTEM";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type ApiOwnerOrder = {
  status: string;
};

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
    tone: NotificationTone;
    label: string;
  }
> = {
  order: {
    icon: ShoppingBag,
    tone: "blue",
    label: "Pesanan",
  },
  stock: {
    icon: AlertCircle,
    tone: "amber",
    label: "Stok",
  },
  wallet: {
    icon: WalletCards,
    tone: "emerald",
    label: "Saldo",
  },
  review: {
    icon: Star,
    tone: "violet",
    label: "Ulasan",
  },
  system: {
    icon: CheckCircle2,
    tone: "slate",
    label: "Sistem",
  },
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} jam lalu`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? "Kemarin" : `${days} hari lalu`;
}

function mapNotificationType(type: ApiNotification["type"]): NotificationType {
  switch (type) {
    case "ORDER":
      return "order";
    case "REFUND":
      return "wallet";
    case "PROMO":
      return "system";
    default:
      return "system";
  }
}

function getActionLabel(notification: ApiNotification) {
  if (notification.href?.includes("/owner/orders")) {
    return "Buka Order";
  }

  if (notification.href?.includes("/owner/wallet")) {
    return "Buka Saldo";
  }

  if (notification.href?.includes("/owner/menu")) {
    return "Kelola Menu";
  }

  return notification.type === "ORDER" ? "Daftar Order" : "Buka Detail";
}

function mapApiNotification(notification: ApiNotification): OwnerNotification {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.body,
    time: formatRelativeTime(notification.createdAt),
    type: mapNotificationType(notification.type),
    unread: notification.readAt === null,
    actionLabel: getActionLabel(notification),
    href: notification.href || "/owner/dashboard",
  };
}

export default function OwnerNotificationsPage() {
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingNotifications(true);
      }

      try {
        const [notificationsResponse, ordersResponse] = await Promise.all([
          fetch("/api/notifications", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
        ]);
        const notificationsData = (await notificationsResponse.json()) as {
          ok: boolean;
          message?: string;
          notifications?: ApiNotification[];
        };
        const ordersData = (await ordersResponse.json()) as {
          ok: boolean;
          message?: string;
          orders?: ApiOwnerOrder[];
        };

        if (!notificationsResponse.ok || !notificationsData.ok) {
          throw new Error(
            notificationsData.message || "Notifikasi owner gagal dimuat.",
          );
        }

        if (!ordersResponse.ok || !ordersData.ok) {
          throw new Error(ordersData.message || "Jumlah order gagal dimuat.");
        }

        setNotifications(
          (notificationsData.notifications || []).map(mapApiNotification),
        );
        emitUnreadNotificationsChanged();
        setActiveOrderCount(
          (ordersData.orders || []).filter(
            (order) =>
              ![
                "COMPLETED",
                "NO_SHOW",
                "CANCELLED",
                "REFUNDED",
                "PAYMENT_FAILED",
              ].includes(order.status),
          ).length,
        );
        setNotice(null);
      } catch (error) {
        if (!silent) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Notifikasi owner gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingNotifications(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimePolling({
    intervalMs: 15000,
    onPoll: () => loadNotifications({ silent: true }),
  });

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

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        throw new Error("Notifikasi gagal diperbarui.");
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          unread: false,
        })),
      );
      emitUnreadNotificationsChanged();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Notifikasi gagal diperbarui.",
      );
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: notificationId }),
      });

      if (!response.ok) {
        throw new Error("Notifikasi gagal diperbarui.");
      }

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
      emitUnreadNotificationsChanged();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Notifikasi gagal diperbarui.",
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl text-gray-900">
      <NotificationCenterHeader
        eyebrow="Owner"
        description="Pantau order baru, stok menipis, saldo, ulasan, dan status sistem dari satu tempat."
        unreadCount={unreadCount}
        onMarkAllRead={markAllAsRead}
      />

      {notice ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 sm:px-6">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 border-b border-gray-200 bg-white p-4 sm:grid-cols-3 sm:p-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <Bell size={22} className="mb-4 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-700">Belum Dibaca</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-900">
              {unreadCount}
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <AlertCircle size={22} className="mb-4 text-red-600" />
            <p className="text-sm font-bold text-red-700">Prioritas</p>
            <p className="mt-1 text-3xl font-extrabold text-red-900">
              {urgentCount}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <PackageCheck size={22} className="mb-4 text-blue-600" />
            <p className="text-sm font-bold text-blue-700">Order Aktif</p>
            <p className="mt-1 text-3xl font-extrabold text-blue-900">
              {activeOrderCount}
            </p>
          </div>
      </div>

      <NotificationFilterTabs
        options={filters}
        activeFilter={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="bg-gray-50 p-4 sm:p-6">
        <NotificationListHeading />
        <div className="space-y-3">
          {isLoadingNotifications ? (
            <StateCard
              title="Memuat notifikasi"
              description="Data diambil dari notifikasi akun owner yang sedang login."
              variant="loading"
              className="rounded-[24px]"
            />
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const style = notificationStyleByType[notification.type];

              return (
                <NotificationCard
                  key={notification.id}
                  icon={style.icon}
                  tone={style.tone}
                  label={style.label}
                  title={notification.title}
                  description={notification.description}
                  time={notification.time}
                  unread={notification.unread}
                  href={notification.href}
                  actionLabel={notification.actionLabel}
                  onMarkRead={() => markAsRead(notification.id)}
                />
              );
            })
          ) : (
            <StateCard
              title="Tidak ada notifikasi"
              description="Filter ini belum memiliki notifikasi. Coba kategori lain."
              variant="empty"
              className="rounded-[24px]"
              action={
                activeFilter === "all"
                  ? undefined
                  : {
                      label: "Tampilkan Semua",
                      onClick: () => setActiveFilter("all"),
                    }
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
