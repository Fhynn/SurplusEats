import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Leaf,
  Mail,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

const publicNavigation = [
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "Kontak", href: "/kontak" },
] as const;

export const supportEmail = "support@resqfood.store";

export function PublicSiteShell({
  activeHref,
  children,
}: Readonly<{
  activeHref: (typeof publicNavigation)[number]["href"];
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7faf8] text-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none"
            aria-label="Kembali ke halaman masuk ResQFood"
          >
            <Image
              src="/logo.webp"
              alt=""
              width={36}
              height={40}
              className="h-9 w-8 rounded-lg object-contain"
            />
            <span className="text-lg font-extrabold tracking-tight">
              ResQFood
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
          >
            Masuk
            <ArrowRight size={16} />
          </Link>
        </div>

        <nav
          aria-label="Navigasi informasi ResQFood"
          className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 px-4 pb-3 sm:flex sm:px-6 lg:px-8"
        >
          {publicNavigation.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-extrabold transition-colors sm:shrink-0 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Leaf size={21} />
              </span>
              <div>
                <p className="font-extrabold">ResQFood</p>
                <p className="text-xs font-bold text-emerald-600">
                  #Save Food, Serve Good
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 font-medium text-gray-600">
              Marketplace makanan surplus untuk pickup langsung dari mitra.
              ResQFood membantu makanan layak konsumsi menemukan pembeli sebelum
              waktu pickup berakhir.
            </p>
          </div>

          <div className="space-y-3 text-sm font-bold text-gray-600">
            <a
              href={`mailto:${supportEmail}`}
              className="flex min-h-11 items-center gap-2 rounded-xl transition-colors hover:text-emerald-700"
            >
              <Mail size={17} />
              {supportEmail}
            </a>
            <p className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-600" />
              Dikelola oleh Fhynn, Indonesia
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-xs font-semibold text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>Copyright 2026 Fhynn. Seluruh hak cipta dilindungi.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {publicNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-emerald-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
