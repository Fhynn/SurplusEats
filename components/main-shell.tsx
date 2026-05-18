"use client";

import Link from "next/link";
import { Bot, Home, ShoppingBag, User } from "lucide-react";
import { usePathname } from "next/navigation";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";

const NAV_ITEMS = [
  { href: "/home", label: "Beranda", icon: Home },
  { href: "/ai", label: "ResQBot", icon: Bot },
  { href: "/cart", label: "Keranjang", icon: ShoppingBag },
  { href: "/profile", label: "Akun", icon: User },
] as const;

export function MainShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { cartCount } = useCustomerApp();

  const renderNavItem = (
    href: (typeof NAV_ITEMS)[number]["href"],
    label: (typeof NAV_ITEMS)[number]["label"],
    Icon: (typeof NAV_ITEMS)[number]["icon"],
    variant: "mobile" | "desktop",
  ) => {
    const isActive =
      pathname === href ||
      (href === "/home" && ["/browse", "/browser"].includes(pathname));

    if (variant === "desktop") {
      return (
        <Link
          key={href}
          href={href}
          className={`motion-press flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-extrabold transition-all ${
            isActive
              ? "bg-emerald-50 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
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

          {href === "/cart" && cartCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-extrabold text-white">
              {cartCount}
            </span>
          ) : null}
        </Link>
      );
    }

    return (
      <Link
        key={href}
        href={href}
        className={`motion-press relative flex flex-col items-center gap-1 transition-all duration-300 ${
          isActive
            ? "scale-110 text-emerald-500"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <Icon
          size={22}
          className={isActive ? "nav-active-pulse fill-emerald-100" : ""}
        />
        <span className="text-[9px] font-bold">{label}</span>

        {href === "/cart" && cartCount > 0 ? (
          <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-[9px] font-extrabold text-white">
            {cartCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex h-full min-h-0 w-full">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 shadow-[4px_0_24px_rgba(15,23,42,0.04)] md:flex">
          <Link href="/home" className="mb-8 flex items-center gap-3 px-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Home size={21} />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-gray-950">
              Surplus<span className="text-emerald-500">Eats</span>
            </span>
          </Link>

          <nav className="grid gap-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) =>
              renderNavItem(href, label, Icon, "desktop"),
            )}
          </nav>
        </aside>

        <div
          key={pathname}
          className="app-page-enter flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </div>
      </div>

      <nav className="bottom-nav-enter absolute right-0 bottom-0 left-0 z-50 grid grid-cols-4 rounded-t-[32px] border-t border-gray-100 bg-white/90 px-4 pt-4 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) =>
          renderNavItem(href, label, Icon, "mobile"),
        )}
      </nav>
    </MobileDeviceFrame>
  );
}
