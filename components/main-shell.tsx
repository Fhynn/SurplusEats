"use client";

import Link from "next/link";
import { Home, ShoppingBag, User } from "lucide-react";
import { usePathname } from "next/navigation";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";

const NAV_ITEMS = [
  { href: "/home", label: "Beranda", icon: Home },
  { href: "/cart", label: "Keranjang", icon: ShoppingBag },
  { href: "/profile", label: "Profil", icon: User },
] as const;

export function MainShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { cartCount } = useCustomerApp();

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {children}
      </div>

      <nav className="absolute right-0 bottom-0 left-0 z-50 flex items-center justify-between rounded-t-[32px] border-t border-gray-100 bg-white/90 px-6 pt-4 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href === "/home" && ["/browse", "/browser"].includes(pathname));

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive
                  ? "scale-110 text-emerald-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} className={isActive ? "fill-emerald-100" : ""} />
              <span className="text-[9px] font-bold">{label}</span>

              {href === "/cart" && cartCount > 0 ? (
                <span className="absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-[9px] font-extrabold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </MobileDeviceFrame>
  );
}
