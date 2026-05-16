"use client";

import { ChevronLeft, Package, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export function CustomerOrderTrackingScreen() {
  const router = useRouter();

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-2 mb-10 flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
          aria-label="Kembali"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Package size={36} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
            Pilih Pesanan Aktif
          </h1>
          <p className="mt-3 text-sm leading-6 font-medium text-gray-500">
            Tracking hanya menampilkan data order asli dari database. Buka
            halaman pesanan lalu pilih order yang sedang berjalan.
          </p>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(16,185,129,0.25)]"
          >
            <ShoppingBag size={18} />
            Buka Pesanan
          </button>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
