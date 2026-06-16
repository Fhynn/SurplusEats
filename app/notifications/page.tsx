"use client";

import { Gift, ReceiptText, RefreshCcw, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import {
  NotificationCard,
  NotificationCenterHeader,
  NotificationFilterTabs,
  NotificationListHeading,
  type NotificationTone,
} from "@/components/notification-center-ui";
import { StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import { emitUnreadNotificationsChanged } from "@/components/use-unread-notification-count";

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
    tone: "emerald",
    label: "Order",
  },
  promo: {
    icon: Gift,
    tone: "amber",
    label: "Promo",
  },
  refund: {
    icon: RefreshCcw,
    tone: "blue",
    label: "Refund",
  },
  system: {
    icon: ReceiptText,
    tone: "violet",
    label: "Sistem",
  },
} satisfies Record<
  NotificationType,
  { icon: typeof ShoppingBag; tone: NotificationTone; label: string }
>;

const notificationFilters: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum Dibaca" },
  { key: "order", label: "Order" },
  { key: "promo", label: "Promo" },
  { key: "refund", label: "Refund" },
  { key: "system", label: "Sistem" },
];

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
  const { refreshUnreadNotifications } = useCustomerApp();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingNotifications(true);
      }

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const result = (await response.json()) as {
          ok: boolean;
          notifications?: ApiNotification[];
        };

        setNotifications(result.notifications?.map(apiNotificationToUi) ?? []);
        await refreshUnreadNotifications();
        emitUnreadNotificationsChanged();
      } catch {
        if (!silent) {
          setNotifications([]);
        }
      } finally {
        if (!silent) {
          setIsLoadingNotifications(false);
        }
      }
    },
    [refreshUnreadNotifications],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimePolling({
    intervalMs: 15000,
    onPoll: () => loadNotifications({ silent: true }),
  });

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
    await refreshUnreadNotifications();
    emitUnreadNotificationsChanged();
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
    await refreshUnreadNotifications();
    emitUnreadNotificationsChanged();
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
    await refreshUnreadNotifications();
    emitUnreadNotificationsChanged();
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <div className="sticky top-0 z-20 md:mx-auto md:w-full md:max-w-5xl">
          <NotificationCenterHeader
            eyebrow="Customer"
            description="Pantau status order, promo, refund, dan informasi akun dari satu tempat."
            unreadCount={unreadCount}
            backHref="/home"
            onMarkAllRead={markAllAsRead}
          />
          <NotificationFilterTabs
            options={notificationFilters}
            activeFilter={activeFilter}
            counts={filterCounts}
            onChange={setActiveFilter}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-5xl [&::-webkit-scrollbar]:hidden">
          <NotificationListHeading />

          <section className="space-y-3">
            {isLoadingNotifications ? (
              <StateCard
                title="Memuat notifikasi"
                description="Notifikasi diambil sesuai session akun yang sedang login."
                variant="loading"
                className="rounded-[24px]"
              />
            ) : null}

            {filteredNotifications.map((notification) => {
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
                  onMarkRead={() => markAsRead(notification.id)}
                  onDelete={() => removeNotification(notification.id)}
                />
              );
            })}

            {!isLoadingNotifications && filteredNotifications.length === 0 ? (
              <StateCard
                title="Tidak ada notifikasi"
                description="Ubah filter atau tunggu update terbaru dari order, promo, dan refund."
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
            ) : null}
          </section>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
