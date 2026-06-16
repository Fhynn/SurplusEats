"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimePolling } from "@/components/use-realtime-polling";

const notificationsChangedEvent = "resqfood:notifications-changed";

type NotificationSummary = {
  readAt: string | null;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: NotificationSummary[];
};

export function emitUnreadNotificationsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(notificationsChangedEvent));
}

export function useUnreadNotificationCount() {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const refreshUnreadNotificationCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await response.json()) as NotificationsResponse;

      if (!response.ok || !data.ok) {
        setUnreadNotificationCount(0);
        return;
      }

      setUnreadNotificationCount(
        (data.notifications ?? []).filter((notification) => !notification.readAt)
          .length,
      );
    } catch {
      setUnreadNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      void refreshUnreadNotificationCount();
    };

    handleRefresh();
    window.addEventListener(notificationsChangedEvent, handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener(notificationsChangedEvent, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [refreshUnreadNotificationCount]);

  useRealtimePolling({
    intervalMs: 15000,
    onPoll: refreshUnreadNotificationCount,
  });

  return { unreadNotificationCount, refreshUnreadNotificationCount };
}
