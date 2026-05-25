"use client";

import Link from "next/link";
import { Bot, Home, Leaf, ShoppingBag, User } from "lucide-react";
import { usePathname } from "next/navigation";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";

const NAV_ITEMS = [
  { href: "/home", label: "Beranda", icon: Home },
  { href: "/ai", label: "ResQBot", icon: Bot },
  { href: "/cart", label: "Keranjang", icon: ShoppingBag },
  { href: "/profile", label: "Akun", icon: User },
] as const;

function isNavActive(pathname: string, href: (typeof NAV_ITEMS)[number]["href"]) {
  if (pathname === href) {
    return true;
  }

  if (href === "/home") {
    return (
      pathname === "/browse" ||
      pathname === "/browser" ||
      pathname.startsWith("/detail/") ||
      pathname.startsWith("/stores/")
    );
  }

  if (href === "/cart") {
    return pathname === "/checkout";
  }

  if (href === "/profile") {
    return pathname.startsWith("/profile/");
  }

  return false;
}

export function MainShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { cartCount } = useCustomerApp();

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex h-full min-h-0 w-full bg-gray-50 font-sans text-gray-900">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
          <Link href="/home" className="flex items-center gap-3 p-6">
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
              <Leaf size={24} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              ResQFood
            </span>
          </Link>

          <nav className="flex-1 space-y-2 px-4 py-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                  {item.href === "/cart" && cartCount > 0 ? (
                    <span className="ml-auto rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-64">
          <div
            key={pathname}
            className="app-page-enter h-full min-h-0 overflow-hidden"
          >
            {children}
          </div>
        </main>

        <nav className="fixed bottom-0 z-50 flex w-full items-center justify-around border-t border-gray-200 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] lg:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex w-16 flex-col items-center gap-1 p-2 transition-colors ${
                  isActive
                    ? "text-emerald-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon
                  size={22}
                  fill={isActive ? "currentColor" : "none"}
                  className={isActive ? "text-emerald-600" : undefined}
                />
                {item.href === "/cart" && cartCount > 0 ? (
                  <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
                ) : null}
                <span
                  className={`text-[10px] ${
                    isActive ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </MobileDeviceFrame>
  );
}
