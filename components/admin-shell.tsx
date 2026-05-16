"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  FileBadge2,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

const adminNavItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) =>
      pathname === "/admin/dashboard" && !dashboardTab,
  },
  {
    href: "/admin/dashboard?tab=users",
    label: "Pengguna",
    icon: Users,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) =>
      pathname.startsWith("/admin/users/") ||
      (pathname === "/admin/dashboard" && dashboardTab === "users"),
  },
  {
    href: "/admin/dashboard?tab=verification",
    label: "Verifikasi",
    icon: FileBadge2,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) =>
      pathname.startsWith("/admin/verifications/") ||
      (pathname === "/admin/dashboard" && dashboardTab === "verification"),
  },
  {
    href: "/admin/dashboard?tab=transactions",
    label: "Transaksi",
    icon: ReceiptText,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) =>
      pathname.startsWith("/admin/transactions/") ||
      pathname.startsWith("/admin/refunds/") ||
      (pathname === "/admin/dashboard" && dashboardTab === "transactions"),
  },
  {
    href: "/admin/dashboard?tab=analytics",
    label: "Analitik",
    icon: BarChart3,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) =>
      pathname === "/admin/dashboard" && dashboardTab === "analytics",
  },
  {
    href: "/admin/notifications",
    label: "Notifikasi",
    icon: Bell,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) => {
      void dashboardTab;
      return pathname === "/admin/notifications";
    },
  },
  {
    href: "/admin/settings",
    label: "Pengaturan",
    icon: Settings,
    badge: undefined,
    match: (pathname: string, dashboardTab: string | null) => {
      void dashboardTab;
      return pathname === "/admin/settings";
    },
  },
] as const;

const pageLabelByPath = [
  {
    test: (pathname: string) => pathname === "/admin/dashboard",
    label: "Control Center",
  },
  {
    test: (pathname: string) => pathname === "/admin/notifications",
    label: "Notification Center",
  },
  {
    test: (pathname: string) => pathname === "/admin/settings",
    label: "Admin Settings",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin/users/"),
    label: "User Audit",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin/verifications/"),
    label: "Verification Review",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin/transactions/"),
    label: "Transaction Review",
  },
  {
    test: (pathname: string) => pathname.startsWith("/admin/refunds/"),
    label: "Refund Review",
  },
] as const;

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dashboardTab = searchParams.get("tab");
  const pageLabel =
    pageLabelByPath.find((item) => item.test(pathname))?.label ??
    "Admin Console";
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 flex-col bg-gray-950 text-white shadow-[12px_0_36px_rgba(0,0,0,0.08)] lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Surplus<span className="text-emerald-400">Admin</span>
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  {pageLabel}
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi Admin
            </p>
            {adminNavItems.map(({ href, label, icon: Icon, badge, match }) => {
              const isActive = match(pathname, dashboardTab);

              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/10"
                      : "text-gray-400 hover:bg-emerald-500/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={20}
                      className={isActive ? "text-emerald-400" : "text-gray-500"}
                    />
                    {label}
                  </span>
                  {badge ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:text-gray-600"
            >
              <LogOut size={18} />
              {isLoggingOut ? "Keluar..." : "Keluar Akun"}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-sm font-extrabold text-gray-950"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-emerald-300">
                  <ShieldCheck size={19} />
                </span>
                SurplusAdmin
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500"
                  aria-label="Buka notifikasi admin"
                >
                  <Bell size={18} />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 disabled:cursor-not-allowed disabled:text-red-300"
                  aria-label="Keluar akun admin"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {adminNavItems.map(({ href, label, match }) => (
                <Link
                  key={label}
                  href={href}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold ${
                    match(pathname, dashboardTab)
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </header>

          <div className="admin-shell-content min-w-0 flex-1 overflow-y-auto bg-gray-50">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
