"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Gift,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type NotificationType = "order" | "promo" | "refund" | "system";

type CustomerNotification = {
  id: number;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  unread: boolean;
  href?: string;
};

const initialNotifications: CustomerNotification[] = [
  {
    id: 1,
    title: "Pesanan Siap Diambil",
    description:
      "Order SFM-99A2X dari Bakehouse Bakery sudah siap. Tunjukkan QR ke kasir sebelum 21:00 WIB.",
    time: "Baru saja",
    type: "order",
    unread: true,
    href: "/orders/SFM-99A2X",
  },
  {
    id: 2,
    title: "Voucher Baru Tersedia",
    description:
      "Kamu mendapat voucher Diskon Food Hero 50% untuk pickup malam ini.",
    time: "18 menit lalu",
    type: "promo",
    unread: true,
    href: "/profile/vouchers",
  },
  {
    id: 3,
    title: "Pembayaran Berhasil",
    description:
      "Pembayaran order SFM-99A2X berhasil. Struk pesanan sudah tersedia.",
    time: "35 menit lalu",
    type: "system",
    unread: false,
    href: "/payment-success",
  },
  {
    id: 4,
    title: "Refund Diproses",
    description:
      "Pengajuan refund order SFM-66D9W sedang direview oleh tim SurplusEats.",
    time: "Kemarin",
    type: "refund",
    unread: false,
  },
];

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

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex min-h-full flex-1 flex-col bg-[#f8fafc]">
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
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            {notifications.map((notification) => {
              const style = notificationStyleByType[notification.type];
              const Icon = style.icon;
              const content = (
                <article
                  className={`rounded-[24px] border p-4 shadow-sm transition-all ${
                    notification.unread
                      ? "border-emerald-200 bg-white shadow-[0_10px_24px_rgba(16,185,129,0.06)]"
                      : "border-gray-100 bg-white/80"
                  } ${notification.href ? "hover:border-emerald-200" : ""}`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.className}`}
                    >
                      <Icon size={21} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {notification.title}
                        </h3>
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
                </article>
              );

              if (notification.href) {
                return (
                  <Link key={notification.id} href={notification.href}>
                    {content}
                  </Link>
                );
              }

              return <div key={notification.id}>{content}</div>;
            })}
          </section>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
