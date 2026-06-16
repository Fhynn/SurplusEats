"use client";

import { Gift, ReceiptText, RefreshCcw, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  NotificationCard,
  NotificationCenterHeader,
  NotificationFilterTabs,
  NotificationListHeading,
  type NotificationTone,
} from "@/components/notification-center-ui";
import { InlineNotice, StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import { emitUnreadNotificationsChanged } from "@/components/use-unread-notification-count";

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: "ORDER" | "PROMO" | "REFUND" | "SYSTEM";
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type AdminNotificationFilter =
  | "all"
  | "unread"
  | AdminNotification["type"];

const filters: Array<{
  key: AdminNotificationFilter;
  label: string;
}> = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum Dibaca" },
  { key: "ORDER", label: "Order" },
  { key: "PROMO", label: "Promo" },
  { key: "REFUND", label: "Refund" },
  { key: "SYSTEM", label: "Sistem" },
];

const notificationStyleByType: Record<
  AdminNotification["type"],
  {
    icon: typeof ShoppingBag;
    tone: NotificationTone;
    label: string;
  }
> = {
  ORDER: { icon: ShoppingBag, tone: "emerald", label: "Order" },
  PROMO: { icon: Gift, tone: "amber", label: "Promo" },
  REFUND: { icon: RefreshCcw, tone: "blue", label: "Refund" },
  SYSTEM: { icon: ReceiptText, tone: "slate", label: "Sistem" },
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<AdminNotificationFilter>("all");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }

    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.readAt);
    }

    return notifications.filter((item) => item.type === activeFilter);
  }, [activeFilter, notifications]);
  const filterCounts = useMemo(
    () =>
      filters.reduce(
        (counts, filter) => ({
          ...counts,
          [filter.key]:
            filter.key === "all"
              ? notifications.length
              : filter.key === "unread"
                ? unreadCount
                : notifications.filter((item) => item.type === filter.key)
                    .length,
        }),
        {} as Record<AdminNotificationFilter, number>,
      ),
    [notifications, unreadCount],
  );

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          notifications?: AdminNotification[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Notifikasi gagal dimuat.");
        }

        setNotifications(data.notifications ?? []);
        emitUnreadNotificationsChanged();
        setNotice(null);
      } catch (error) {
        if (!silent) {
          setNotice(
            error instanceof Error ? error.message : "Notifikasi gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
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

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await loadNotifications();
    emitUnreadNotificationsChanged();
  };

  const markAsRead = async (id: string) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      setNotice("Notifikasi gagal diperbarui.");
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    emitUnreadNotificationsChanged();
  };

  const deleteNotification = async (id: string) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadNotifications();
    emitUnreadNotificationsChanged();
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <NotificationCenterHeader
        eyebrow="Admin"
        description="Pantau aktivitas order, promo, refund, dan informasi sistem dari satu tempat."
        unreadCount={unreadCount}
        onMarkAllRead={markAllAsRead}
      />

      {notice ? (
        <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <InlineNotice variant="error" description={notice} />
        </div>
      ) : null}

      <NotificationFilterTabs
        options={filters}
        activeFilter={activeFilter}
        counts={filterCounts}
        onChange={setActiveFilter}
      />

      <section className="bg-gray-50 p-4 sm:p-6">
        <NotificationListHeading />
        {isLoading ? (
          <StateCard
            title="Memuat notifikasi"
            description="Mengambil notifikasi admin terbaru."
            variant="loading"
            size="sm"
          />
        ) : filteredNotifications.length === 0 ? (
          <StateCard
            title="Belum ada notifikasi"
            description="Filter ini belum memiliki notifikasi. Coba kategori lain."
            variant="empty"
            size="sm"
            action={
              activeFilter === "all"
                ? undefined
                : {
                    label: "Tampilkan Semua",
                    onClick: () => setActiveFilter("all"),
                  }
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => {
              const style = notificationStyleByType[item.type];

              return (
                <NotificationCard
                  key={item.id}
                  icon={style.icon}
                  tone={style.tone}
                  label={style.label}
                  title={item.title}
                  description={item.body}
                  time={formatTime(item.createdAt)}
                  unread={!item.readAt}
                  href={item.href || undefined}
                  onMarkRead={() => markAsRead(item.id)}
                  onDelete={() => deleteNotification(item.id)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
