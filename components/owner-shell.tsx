"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

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
    badge: "3 Baru",
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
    badge: "4 Baru",
  },
] as const;

export function OwnerShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardTab = searchParams.get("tab");
  const shouldUseShell = shellRoutes.has(pathname) || pathname.startsWith("/owner/orders/");

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
          </div>
        </aside>

        <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="relative hidden w-96 md:block">
              <Search
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari order ID atau menu..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-12 text-sm font-medium text-gray-900 transition-all outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

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
              <div className="group flex cursor-pointer items-center gap-3">
                <div className="hidden text-right md:block">
                  <p className="text-sm leading-tight font-extrabold text-gray-900">
                    Bakehouse Bakery
                  </p>
                  <p className="text-xs font-medium text-gray-500">Owner</p>
                </div>
                <div className="h-10 w-10 overflow-hidden rounded-xl border-2 border-transparent bg-emerald-100 transition-all group-hover:border-emerald-500">
                  <Image
                    src="https://images.unsplash.com/photo-1583338917451-face2751d8d5?q=80&w=150&auto=format&fit=crop"
                    alt="Shop avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
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
