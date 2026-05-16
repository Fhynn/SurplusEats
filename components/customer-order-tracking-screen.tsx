"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MessageCircle,
  Navigation,
  Package,
  QrCode,
  ReceiptText,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const order = {
  id: "SFM-99A2X",
  restaurant: "Bakehouse Bakery",
  address: "Jl. Sudirman No. 45, Pekanbaru",
  item: "Paket Roti Artisan Sourdough",
  total: 17000,
  pickup: "19:00 - 21:00 WIB",
};

const timelineSteps = [
  {
    title: "Pesanan Dikonfirmasi",
    description: "Restoran sudah menerima pesanan dan detail pickup.",
    time: "19:05",
    icon: CheckCircle2,
    state: "done",
  },
  {
    title: "Sedang Disiapkan",
    description: "Owner sedang mengemas makanan surplusmu.",
    time: "19:15",
    icon: CheckCircle2,
    state: "done",
  },
  {
    title: "Pesanan Siap Diambil",
    description: "Tunjukkan QR ke kasir sebelum batas pickup.",
    time: "19:30",
    icon: Package,
    state: "current",
  },
] as const;

export function CustomerOrderTrackingScreen() {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-white">
        <section className="absolute top-0 h-72 w-full overflow-hidden bg-emerald-50">
          <Image
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop"
            alt="Peta lokasi Bakehouse Bakery"
            fill
            sizes="400px"
            priority
            className="object-cover opacity-60 grayscale mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

          <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="mb-2 rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg">
              {order.restaurant}
            </div>
            <div className="flex h-9 w-9 animate-bounce items-center justify-center rounded-full border-4 border-white bg-emerald-500 shadow-xl">
              <Store size={15} className="text-white" />
            </div>
          </div>
        </section>

        <header className="relative z-20 flex items-center justify-between px-6 pt-10 pb-4">
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="-ml-2 rounded-full bg-white/80 p-2 text-gray-800 shadow-sm backdrop-blur-md transition-colors hover:bg-gray-100"
            aria-label="Kembali ke riwayat pesanan"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-gray-700 shadow-sm backdrop-blur-md">
            ID: {order.id}
          </div>
        </header>

        <div className="relative z-20 mt-12 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Package size={32} />
              </div>
              <h1 className="mb-1 text-2xl font-extrabold text-emerald-600">
                Siap Diambil!
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Datang ke toko sebelum 21:00 WIB dan tunjukkan QR pickup.
              </p>
            </div>

            <div className="relative mb-6 flex flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-gray-200 bg-[#f8fafc] p-6">
              <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500 opacity-20 blur-[50px]" />
              <div className="absolute bottom-0 left-0 h-20 w-20 bg-blue-500 opacity-20 blur-[50px]" />

              <div className="relative z-10 mb-3 rounded-2xl bg-white p-3 shadow-sm">
                <QrCode size={116} className="text-gray-900" />
              </div>
              <p className="relative z-10 text-center text-xs font-bold tracking-widest text-gray-500 uppercase">
                Tunjukkan QR ke Kasir
              </p>
            </div>

            <div className="mb-6 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-gray-950">
                    {order.item}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {order.restaurant}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold text-gray-950">
                  {formatRp(order.total)}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-600">
                  <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>Pickup {order.pickup}</span>
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-600">
                  <Store size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{order.address}</span>
                </div>
              </div>
            </div>

            <div className="relative mb-8 space-y-6 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-emerald-200 before:to-gray-200">
              {timelineSteps.map((step) => {
                const Icon = step.icon;
                const isCurrent = step.state === "current";

                return (
                  <div key={step.title} className="relative flex items-center gap-4">
                    <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow">
                      <Icon size={16} />
                    </div>
                    <div
                      className={`flex-1 rounded-2xl p-4 ${
                        isCurrent
                          ? "border border-emerald-100 bg-emerald-50 shadow-sm"
                          : "bg-white"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h2
                          className={`text-sm font-bold ${
                            isCurrent ? "text-emerald-900" : "text-gray-900"
                          }`}
                        >
                          {step.title}
                        </h2>
                        <span
                          className={`text-[10px] font-bold ${
                            isCurrent ? "text-emerald-600" : "text-gray-400"
                          }`}
                        >
                          {step.time}
                        </span>
                      </div>
                      <p
                        className={`text-xs ${
                          isCurrent ? "text-emerald-700" : "text-gray-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isChatOpen ? (
              <div className="mb-4 rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <MessageCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-extrabold text-blue-950">
                      Chat restoran tersambung
                    </p>
                    <p className="mt-1 text-xs leading-5 font-medium text-blue-700">
                      Restoran melihat ID {order.id}. Datang sesuai jam pickup
                      dan bawa QR untuk validasi kasir.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Bakehouse%20Bakery"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 p-4 text-blue-600 transition-colors hover:bg-blue-100"
              >
                <Navigation size={20} />
                <span className="text-xs font-bold">Arahkan Lokasi</span>
              </a>
              <button
                type="button"
                onClick={() => setIsChatOpen((current) => !current)}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <MessageCircle size={20} />
                <span className="text-xs font-bold">Chat Restoran</span>
              </button>
            </div>

            <Link
              href="/orders/SFM-99A2X"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-4 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ReceiptText size={18} />
              Buka Detail Pesanan
            </Link>
          </section>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
