"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MailCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type NotificationTone =
  | "emerald"
  | "blue"
  | "amber"
  | "violet"
  | "rose"
  | "slate";

type NotificationFilterOption<T extends string> = {
  key: T;
  label: string;
};

const toneStyles: Record<
  NotificationTone,
  { icon: string; badge: string; unreadBorder: string }
> = {
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    unreadBorder: "border-emerald-200",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
    badge: "bg-blue-50 text-blue-700",
    unreadBorder: "border-blue-200",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    badge: "bg-amber-50 text-amber-700",
    unreadBorder: "border-amber-200",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    badge: "bg-violet-50 text-violet-700",
    unreadBorder: "border-violet-200",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700",
    unreadBorder: "border-rose-200",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    unreadBorder: "border-slate-300",
  },
};

export function NotificationCenterHeader({
  eyebrow,
  title = "Pusat Notifikasi",
  description,
  unreadCount,
  backHref,
  onMarkAllRead,
}: Readonly<{
  eyebrow: string;
  title?: string;
  description: string;
  unreadCount: number;
  backHref?: string;
  onMarkAllRead: () => void | Promise<void>;
}>) {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Kembali"
            >
              <ChevronLeft size={20} />
            </Link>
          ) : null}

          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
            <Bell
              size={19}
              className={unreadCount > 0 ? "notification-bell-ring" : undefined}
            />
            {unreadCount > 0 ? (
              <span className="notification-badge-pulse absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-extrabold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            disabled={unreadCount === 0}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:flex-none"
          >
            <CheckCircle2 size={17} />
            Tandai Semua Dibaca
          </button>
        </div>
      </div>
    </header>
  );
}

export function NotificationFilterTabs<T extends string>({
  options,
  activeFilter,
  counts,
  onChange,
}: Readonly<{
  options: Array<NotificationFilterOption<T>>;
  activeFilter: T;
  counts?: Partial<Record<T, number>>;
  onChange: (filter: T) => void;
}>) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => {
          const isActive = option.key === activeFilter;
          const count = counts?.[option.key];

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-extrabold transition-colors ${
                isActive
                  ? "bg-gray-950 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
              aria-pressed={isActive}
            >
              {option.label}
              {typeof count === "number" ? (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NotificationListHeading({
  label = "Terbaru",
  trailing,
}: Readonly<{ label?: string; trailing?: ReactNode }>) {
  return (
    <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
      <h2 className="text-sm font-extrabold tracking-wide text-gray-900">
        {label}
      </h2>
      {trailing ?? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-gray-500 shadow-sm ring-1 ring-gray-100">
          <Clock3 size={12} />
          Diperbarui otomatis
        </span>
      )}
    </div>
  );
}

export function NotificationCard({
  icon: Icon,
  tone,
  label,
  title,
  description,
  time,
  unread,
  href,
  actionLabel = "Buka Detail",
  onMarkRead,
  onDelete,
}: Readonly<{
  icon: LucideIcon;
  tone: NotificationTone;
  label: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  href?: string;
  actionLabel?: string;
  onMarkRead?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}>) {
  const style = toneStyles[tone];

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors sm:p-5 ${
        unread ? style.unreadBorder : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${style.icon}`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${style.badge}`}
            >
              {label}
            </span>
            {unread ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600">
                Baru
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400">
              <Clock3 size={12} />
              {time}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-extrabold text-gray-950 sm:text-base">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-6 font-medium text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {href || onMarkRead || onDelete ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 sm:justify-end">
          {onMarkRead ? (
            <button
              type="button"
              onClick={() => void onMarkRead()}
              disabled={!unread}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-extrabold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 sm:flex-none"
            >
              <MailCheck size={14} />
              {unread ? "Tandai Dibaca" : "Sudah Dibaca"}
            </button>
          ) : null}

          {href ? (
            <Link
              href={href}
              onClick={() => void onMarkRead?.()}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-gray-950 px-4 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 sm:flex-none"
            >
              {actionLabel}
            </Link>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-white px-3 text-xs font-extrabold text-red-600 transition-colors hover:bg-red-50 sm:flex-none"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
