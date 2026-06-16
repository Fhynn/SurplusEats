"use client";

import { useCallback, useEffect, useState } from "react";

import { useRealtimePolling } from "@/components/use-realtime-polling";

type ApiNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: ApiNotification[];
};

type AuthResponse = {
  ok: boolean;
  user?: {
    id: string;
  } | null;
};

const notifiedIdsPrefix = "resqfood:browser-notified-ids:";
const seededKeyPrefix = "resqfood:browser-notifications-seeded:";
const permissionChangedEvent = "resqfood:browser-notification-permission-changed";
const maxStoredNotificationIds = 80;
const maxNotificationsPerSync = 3;

function isBrowserNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

function getStoredIds(storageKey: string) {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey) || "[]",
    ) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredIds(storageKey: string, ids: string[]) {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(new Set(ids)).slice(-maxStoredNotificationIds)),
    );
  } catch {
    // Browser notification tracking is best-effort only.
  }
}

function hasSeededNotifications(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function markSeededNotifications(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Ignore localStorage failure.
  }
}

async function showBrowserNotification(notification: ApiNotification) {
  await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  const registration = await navigator.serviceWorker.ready;
  const targetUrl = notification.href || "/notifications";

  await registration.showNotification(notification.title, {
    body: notification.body,
    icon: "/logo.webp",
    badge: "/logo.webp",
    tag: notification.id,
    data: {
      url: targetUrl,
    },
  });
}

export function BrowserNotificationManager() {
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const enabled =
    isBrowserNotificationSupported() &&
    permission === "granted" &&
    Boolean(userId);

  useEffect(() => {
    if (!isBrowserNotificationSupported()) {
      return;
    }

    let ignore = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as AuthResponse;

        if (!ignore) {
          setUserId(response.ok && data.ok && data.user ? data.user.id : null);
        }
      } catch {
        if (!ignore) {
          setUserId(null);
        }
      }
    }

    const syncPermission = () => {
      setPermission(Notification.permission);
    };

    syncPermission();
    void loadUser();
    window.addEventListener(permissionChangedEvent, syncPermission);

    return () => {
      ignore = true;
      window.removeEventListener(permissionChangedEvent, syncPermission);
    };
  }, []);

  const syncNotifications = useCallback(async () => {
    if (!enabled || !userId) {
      return;
    }

    const notifiedIdsKey = `${notifiedIdsPrefix}${userId}`;
    const seededKey = `${seededKeyPrefix}${userId}`;

    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await response.json()) as NotificationsResponse;

      if (!response.ok || !data.ok) {
        return;
      }

      const unreadNotifications = (data.notifications ?? [])
        .filter((notification) => !notification.readAt)
        .sort(
          (first, second) =>
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime(),
        );
      const notifiedIds = getStoredIds(notifiedIdsKey);
      const notifiedIdSet = new Set(notifiedIds);

      if (!hasSeededNotifications(seededKey)) {
        writeStoredIds(
          notifiedIdsKey,
          unreadNotifications.map((notification) => notification.id),
        );
        markSeededNotifications(seededKey);
        return;
      }

      const nextNotifications = unreadNotifications
        .filter((notification) => !notifiedIdSet.has(notification.id))
        .slice(-maxNotificationsPerSync);

      for (const notification of nextNotifications) {
        await showBrowserNotification(notification);
        notifiedIdSet.add(notification.id);
      }

      if (nextNotifications.length > 0) {
        writeStoredIds(notifiedIdsKey, Array.from(notifiedIdSet));
      }
    } catch (error) {
      console.warn("Browser notification sync failed", error);
    }
  }, [enabled, userId]);

  useRealtimePolling({
    enabled,
    intervalMs: 20000,
    leading: true,
    onPoll: syncNotifications,
  });

  return null;
}
