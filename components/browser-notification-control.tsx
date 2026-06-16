"use client";

import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type BrowserNotificationControlProps = {
  className?: string;
};

const permissionChangedEvent = "resqfood:browser-notification-permission-changed";

function isBrowserNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

async function showPermissionTestNotification() {
  await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification("Notifikasi ResQFood aktif", {
    body: "Update order, refund, promo, dan support bisa muncul dari browser.",
    icon: "/logo.webp",
    badge: "/logo.webp",
    tag: "resqfood-browser-notification-enabled",
    data: {
      url: "/notifications",
    },
  });
}

export function BrowserNotificationControl({
  className = "",
}: Readonly<BrowserNotificationControlProps>) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const supported = isBrowserNotificationSupported();

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported || isRequesting) {
      return;
    }

    setIsRequesting(true);
    setNotice("");

    try {
      const nextPermission = await Notification.requestPermission();

      setPermission(nextPermission);
      window.dispatchEvent(new Event(permissionChangedEvent));

      if (nextPermission === "granted") {
        await showPermissionTestNotification();
        setNotice("Notifikasi browser aktif.");
      } else if (nextPermission === "denied") {
        setNotice("Izin notifikasi diblokir. Ubah dari pengaturan browser.");
      } else {
        setNotice("Notifikasi belum diaktifkan.");
      }
    } catch {
      setNotice("Notifikasi browser gagal diaktifkan.");
    } finally {
      setIsRequesting(false);
    }
  };

  const testNotification = async () => {
    if (!isSupported || permission !== "granted" || isRequesting) {
      return;
    }

    setIsRequesting(true);
    setNotice("");

    try {
      await showPermissionTestNotification();
      setNotice("Tes notifikasi dikirim.");
    } catch {
      setNotice("Tes notifikasi gagal dikirim.");
    } finally {
      setIsRequesting(false);
    }
  };

  const Icon =
    !isSupported || permission === "denied"
      ? BellOff
      : permission === "granted"
        ? CheckCircle2
        : Bell;
  const title = !isSupported
    ? "Notifikasi browser tidak didukung"
    : permission === "granted"
      ? "Notifikasi browser aktif"
      : permission === "denied"
        ? "Notifikasi browser diblokir"
        : "Aktifkan notifikasi browser";
  const description = !isSupported
    ? "Browser ini belum mendukung notifikasi PWA."
    : permission === "granted"
      ? "Update baru bisa muncul sebagai notifikasi saat web atau PWA sedang aktif."
      : permission === "denied"
        ? "Buka pengaturan browser untuk mengizinkan notifikasi ResQFood."
        : "Izinkan browser menampilkan update order, refund, promo, dan support.";

  return (
    <section
      className={`rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              permission === "granted"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-gray-950">{title}</h2>
            <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
              {description}
            </p>
            {notice ? (
              <p className="mt-2 text-xs font-extrabold text-emerald-700">
                {notice}
              </p>
            ) : null}
          </div>
        </div>

        {isSupported && permission !== "denied" ? (
          <button
            type="button"
            onClick={() =>
              permission === "granted"
                ? void testNotification()
                : void requestPermission()
            }
            disabled={isRequesting}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:bg-gray-300"
          >
            {isRequesting ? <Loader2 size={15} className="animate-spin" /> : null}
            {permission === "granted" ? "Kirim Tes" : "Aktifkan"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
