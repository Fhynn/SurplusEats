"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBellLink({
  href,
  unreadCount,
  active = false,
  ariaLabel = "Buka notifikasi",
  className = "",
}: Readonly<{
  href: string;
  unreadCount: number;
  active?: boolean;
  ariaLabel?: string;
  className?: string;
}>) {
  return (
    <Link
      href={href}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
      } ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Bell
        size={19}
        className={unreadCount > 0 ? "notification-bell-ring" : undefined}
      />
      {unreadCount > 0 ? (
        <span className="notification-badge-pulse absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-extrabold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
