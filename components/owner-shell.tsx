"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

const shellRoutes = new Set([
  "/owner/dashboard",
  "/owner/menu",
  "/owner/notifications",
  "/owner/settings",
  "/owner/wallet",
  "/owner/analytics",
  "/owner/reviews",
]);

const navItems = [
  {
    href: "/owner/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    badge: undefined,
  },
  {
    href: "/owner/dashboard?tab=orders",
    label: "Pesanan",
    icon: ShoppingBag,
    badge: undefined,
  },
  {
    href: "/owner/menu",
    label: "Kelola Menu",
    icon: UtensilsCrossed,
    badge: undefined,
  },
  {
    href: "/owner/wallet",
    label: "Saldo",
    icon: Wallet,
    badge: undefined,
  },
  {
    href: "/owner/analytics",
    label: "Analitik",
    icon: BarChart3,
    badge: undefined,
  },
  {
    href: "/owner/reviews",
    label: "Ulasan",
    icon: Star,
    badge: undefined,
  },
] as const;

export function OwnerShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardTab = searchParams.get("tab");
  const [shellQuery, setShellQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const shouldUseShell = shellRoutes.has(pathname) || pathname.startsWith("/owner/orders/");

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

  const handleShellSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = shellQuery.trim();

    if (!trimmedQuery) {
      return;
    }

    router.push(
      `/owner/dashboard?tab=orders&q=${encodeURIComponent(trimmedQuery)}`,
    );
  };

  if (!shouldUseShell) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-plus-jakarta-sans)] selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:flex">
          <div className="border-b border-gray-50 p-6">
            <Link href="/owner/dashboard" className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500 p-2">
                <Store size={20} className="text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Surplus<span className="text-emerald-500">Owner</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1.5 p-4">
            <p className="mt-4 mb-3 px-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
              Menu Utama
            </p>

            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const isActive =
                (label === "Dashboard" &&
                  pathname === "/owner/dashboard" &&
                  dashboardTab !== "orders") ||
                (label === "Pesanan" &&
                  ((pathname === "/owner/dashboard" && dashboardTab === "orders") ||
                    pathname.startsWith("/owner/orders/"))) ||
                (label === "Kelola Menu" && pathname === "/owner/menu") ||
                (label === "Saldo" && pathname === "/owner/wallet") ||
                (label === "Analitik" && pathname === "/owner/analytics") ||
                (label === "Ulasan" && pathname === "/owner/reviews");

              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex w-full items-center ${
                    badge ? "justify-between" : "gap-3"
                  } rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.1)]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={20}
                      className={isActive ? "text-emerald-500" : "text-gray-400"}
                    />
                    {label}
                  </span>

                  {badge ? (
                    <span className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-50 p-4">
            <Link
              href="/owner/settings"
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                pathname === "/owner/settings"
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Settings
                size={20}
                className={
                  pathname === "/owner/settings"
                    ? "text-emerald-500"
                    : "text-gray-400"
                }
              />
              Pengaturan Restoran
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              <LogOut size={20} className="text-gray-400" />
              {isLoggingOut ? "Keluar..." : "Keluar Akun"}
            </button>
          </div>
        </aside>

        <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <form
              className="relative hidden w-96 md:block"
              onSubmit={handleShellSearch}
            >
              <Search
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={shellQuery}
                onChange={(event) => setShellQuery(event.target.value)}
                placeholder="Cari order ID, customer, atau menu..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-12 text-sm font-medium text-gray-900 transition-all outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </form>

            <div className="ml-auto flex items-center gap-4">
              <Link
                href="/owner/notifications"
                className={`relative rounded-xl p-2.5 transition-colors ${
                  pathname === "/owner/notifications"
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Bell size={20} />
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
              </Link>
              <div className="h-8 w-px bg-gray-200" />
              <Link href="/owner/settings" className="group flex items-center gap-3">
                <div className="hidden text-right md:block">
                  <p className="text-sm leading-tight font-extrabold text-gray-900">
                    Owner Dashboard
                  </p>
                  <p className="text-xs font-medium text-gray-500">Owner</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-transparent bg-emerald-50 text-emerald-600 transition-all group-hover:border-emerald-500">
                  <Store size={20} />
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                aria-label="Keluar akun owner"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
