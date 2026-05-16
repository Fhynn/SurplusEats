"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  MailCheck,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShieldCheck,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type NotificationCategory =
  | "refund"
  | "verification"
  | "risk"
  | "payout"
  | "system";
type NotificationPriority = "high" | "medium" | "low";
type FilterKey = "all" | NotificationCategory;

type AdminNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionLabel: string;
  href: string;
  icon: LucideIcon;
};

const notifications: AdminNotification[] = [
  {
    id: "NTF-9001",
    title: "Refund SE-8821 melewati SLA",
    description:
      "Customer Nadia Putri menunggu keputusan admin untuk dispute makanan tidak sesuai foto.",
    time: "16 Mei 2026, 10:42",
    category: "refund",
    priority: "high",
    actionLabel: "Review Refund",
    href: "/admin/refunds/SE-8821",
    icon: RefreshCcw,
  },
  {
    id: "NTF-9002",
    title: "UMKM baru perlu verifikasi",
    description:
      "Warung Nasi Bu Rini sudah mengirim KTP, foto toko, dan surat izin usaha.",
    time: "16 Mei 2026, 10:10",
    category: "verification",
    priority: "high",
    actionLabel: "Cek Dokumen",
    href: "/admin/verifications/UMKM-24081",
    icon: Building2,
  },
  {
    id: "NTF-9003",
    title: "Akun customer berisiko tinggi",
    description:
      "Arka Wijaya memiliki pola refund dan penggunaan voucher yang perlu audit manual.",
    time: "16 Mei 2026, 09:58",
    category: "risk",
    priority: "high",
    actionLabel: "Lihat Akun",
    href: "/admin/users/USR-10227",
    icon: UserRound,
  },
  {
    id: "NTF-9004",
    title: "Payout owner perlu retry",
    description:
      "Pencairan saldo Bakehouse Bakery tertunda karena respons bank belum final.",
    time: "16 Mei 2026, 09:34",
    category: "payout",
    priority: "medium",
    actionLabel: "Cek Settings",
    href: "/admin/settings",
    icon: WalletCards,
  },
  {
    id: "NTF-9005",
    title: "Audit policy diperbarui",
    description:
      "Aturan risk score untuk refund berulang sudah diperbarui di prototype UI.",
    time: "15 Mei 2026, 18:20",
    category: "system",
    priority: "low",
    actionLabel: "Buka Settings",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    id: "NTF-9006",
    title: "Refund SE-8794 butuh bukti owner",
    description:
      "Bakehouse Senopati belum mengirim catatan pickup untuk kasus pembatalan toko.",
    time: "15 Mei 2026, 16:05",
    category: "refund",
    priority: "medium",
    actionLabel: "Review Refund",
    href: "/admin/refunds/SE-8794",
    icon: ReceiptText,
  },
];

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "refund", label: "Refund" },
  { key: "verification", label: "Verifikasi" },
  { key: "risk", label: "Risk" },
  { key: "payout", label: "Payout" },
  { key: "system", label: "System" },
];

const categoryLabel: Record<NotificationCategory, string> = {
  refund: "Refund",
  verification: "Verifikasi",
  risk: "Risk",
  payout: "Payout",
  system: "System",
};

const priorityClassName: Record<NotificationPriority, string> = {
  high: "bg-red-50 text-red-700 ring-red-100",
  medium: "bg-amber-50 text-amber-700 ring-amber-100",
  low: "bg-gray-100 text-gray-600 ring-gray-200",
};

const priorityLabel: Record<NotificationPriority, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Info",
};

export default function AdminNotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [readIds, setReadIds] = useState<string[]>(["NTF-9005"]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.category === activeFilter,
    );
  }, [activeFilter]);

  const unreadCount = notifications.filter(
    (notification) => !readIds.includes(notification.id),
  ).length;
  const highPriorityCount = notifications.filter(
    (notification) => notification.priority === "high",
  ).length;

  const handleMarkRead = (notificationId: string) => {
    setReadIds((currentIds) =>
      currentIds.includes(notificationId)
        ? currentIds
        : [...currentIds, notificationId],
    );
  };

  const handleMarkAllRead = () => {
    setReadIds(notifications.map((notification) => notification.id));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-gray-900 text-white shadow-[12px_0_36px_rgba(0,0,0,0.08)] lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Surplus<span className="text-emerald-400">Admin</span>
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  Notification Center
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi
            </p>
            <Link
              href="/admin/dashboard"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <ReceiptText size={20} className="text-gray-500" />
              Dashboard Admin
            </Link>
            <Link
              href="/admin/notifications"
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <Bell size={20} className="text-emerald-400" />
              Notifikasi Admin
            </Link>
            <Link
              href="/admin/settings"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <Settings size={20} className="text-gray-500" />
              Pengaturan Admin
            </Link>
          </nav>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  aria-label="Kembali ke dashboard admin"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Notification Center
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    Notifikasi Admin
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-500"
              >
                <CheckCircle2 size={17} />
                Tandai Dibaca
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-gray-950">
                        Antrian Operasional
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                        Pantau alert refund, verifikasi partner, risiko akun, dan
                        payout yang butuh tindakan admin.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-red-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-red-600">
                          Prioritas
                        </p>
                        <p className="mt-1 text-xl font-extrabold text-red-700">
                          {highPriorityCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                        <p className="text-xs font-extrabold text-emerald-600">
                          Belum Dibaca
                        </p>
                        <p className="mt-1 text-xl font-extrabold text-emerald-700">
                          {unreadCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {filters.map((filter) => {
                      const isActive = activeFilter === filter.key;

                      return (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setActiveFilter(filter.key)}
                          className={`rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                            isActive
                              ? "bg-gray-950 text-white"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  {filteredNotifications.map((notification) => {
                    const Icon = notification.icon;
                    const isRead = readIds.includes(notification.id);

                    return (
                      <article
                        key={notification.id}
                        className={`rounded-[28px] border bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors ${
                          isRead
                            ? "border-gray-100"
                            : "border-emerald-100 ring-4 ring-emerald-500/5"
                        }`}
                      >
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                notification.priority === "high"
                                  ? "bg-red-50 text-red-600"
                                  : notification.priority === "medium"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              <Icon size={22} />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-extrabold text-gray-600">
                                  {categoryLabel[notification.category]}
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${priorityClassName[notification.priority]}`}
                                >
                                  {priorityLabel[notification.priority]}
                                </span>
                                {!isRead ? (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                                    Baru
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="text-lg font-extrabold text-gray-950">
                                {notification.title}
                              </h3>
                              <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                                {notification.description}
                              </p>
                              <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-gray-400">
                                <Clock3 size={14} />
                                {notification.time}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                            <button
                              type="button"
                              onClick={() => handleMarkRead(notification.id)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <MailCheck size={16} />
                              {isRead ? "Dibaca" : "Mark Read"}
                            </button>
                            <Link
                              href={notification.href}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                            >
                              {notification.actionLabel}
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Ringkasan Hari Ini
                  </h2>
                  <div className="mt-5 space-y-4">
                    {[
                      ["Refund butuh review", "2 kasus"],
                      ["Partner menunggu", "4 UMKM"],
                      ["Akun risiko tinggi", "1 akun"],
                      ["Payout tertunda", "1 owner"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                      >
                        <span className="text-sm font-bold text-gray-500">
                          {label}
                        </span>
                        <strong className="text-sm font-extrabold text-gray-950">
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    SLA Operasional
                  </h2>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[24px] bg-red-50 p-5">
                      <AlertTriangle size={22} className="text-red-600" />
                      <p className="mt-3 text-sm font-extrabold text-red-700">
                        Refund urgent harus diputuskan di bawah 2 jam.
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-emerald-50 p-5">
                      <CheckCircle2 size={22} className="text-emerald-600" />
                      <p className="mt-3 text-sm font-extrabold text-emerald-700">
                        Verifikasi partner normal: maksimal 1 hari kerja.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Channel Aktif
                  </h2>
                  <div className="mt-5 space-y-3">
                    {[
                      "Dashboard notification center",
                      "Email admin utama",
                      "Webhook operasional internal",
                    ].map((channel) => (
                      <div
                        key={channel}
                        className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4"
                      >
                        <Bell size={18} className="text-emerald-600" />
                        <span className="text-sm font-bold text-gray-700">
                          {channel}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
