"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Clock3, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: "ORDER" | "PROMO" | "REFUND" | "SYSTEM";
  href: string | null;
  readAt: string | null;
  createdAt: string;
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

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);

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
      setNotice(null);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Notifikasi gagal dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await loadNotifications();
  };

  const deleteNotification = async (id: string) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadNotifications();
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
            Notifikasi
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Semua data diambil dari tabel notifikasi admin yang sedang login.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
        >
          <CheckCircle2 size={18} />
          Tandai Semua Dibaca
        </button>
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm md:p-6">
        {isLoading ? (
          <div className="py-12 text-center text-sm font-bold text-gray-500">
            Memuat notifikasi...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Bell size={26} />
            </div>
            <h2 className="text-lg font-extrabold text-gray-950">
              Belum ada notifikasi
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Notifikasi akan muncul setelah ada aktivitas real di database.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const content = (
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                      {item.type}
                    </span>
                    {!item.readAt ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600">
                        Baru
                      </span>
                    ) : null}
                  </div>
                  <h2 className="truncate text-sm font-extrabold text-gray-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                    {item.body}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-gray-400">
                    <Clock3 size={14} />
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              );

              return (
                <article
                  key={item.id}
                  className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  {item.href ? (
                    <Link href={item.href} className="min-w-0 flex-1">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(item.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-400 transition-colors hover:text-red-500"
                    aria-label="Hapus notifikasi"
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
