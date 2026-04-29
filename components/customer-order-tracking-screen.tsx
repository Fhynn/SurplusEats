"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Map,
  QrCode,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export function CustomerOrderTrackingScreen() {
  const router = useRouter();

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex h-full flex-1 flex-col bg-gray-50">
        <div className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="mx-auto -ml-4 text-lg font-extrabold text-gray-900">
            Status Pesanan
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative mb-8 overflow-hidden rounded-[24px] border border-emerald-100 bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-100 opacity-50 blur-2xl" />

            <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h2 className="relative z-10 mb-1 text-xl font-extrabold text-gray-900">
              Pembayaran Berhasil!
            </h2>
            <p className="relative z-10 mb-6 text-sm text-gray-500">
              Pesananmu sudah diteruskan ke restoran.
            </p>

            <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/80 p-5 backdrop-blur-sm">
              <QrCode size={48} className="mb-3 text-gray-800" />
              <p className="mb-1 text-xs font-medium text-gray-500">
                Tunjukkan kode ini saat Pickup
              </p>
              <p className="rounded-lg bg-emerald-50 px-4 py-1 font-mono text-xl font-extrabold tracking-widest text-emerald-600">
                SFM-99A2X
              </p>
            </div>
          </div>

          <h3 className="mb-5 px-1 font-bold text-gray-900">Tracking Timeline</h3>

          <div className="relative rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="absolute top-8 bottom-8 left-[39px] w-0.5 bg-gray-100" />

            <div className="relative z-10 mb-8 flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white shadow-[0_4px_12px_rgba(16,185,129,0.18)]">
                <Check size={16} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Pesanan Dikonfirmasi
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  18:02 - Restoran sedang menyiapkan makananmu.
                </p>
              </div>
            </div>

            <div className="relative z-10 mb-8 flex gap-4">
              <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-amber-100 ring-4 ring-white shadow-[0_4px_12px_rgba(251,191,36,0.18)]">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Menunggu Waktu Pickup
                </h4>
                <p className="mt-2 inline-block rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-[0_4px_12px_rgba(251,191,36,0.10)]">
                  Estimasi: 19:00 - 20:00
                </p>
              </div>
            </div>

            <div className="relative z-10 flex gap-4 opacity-40">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 ring-4 ring-white">
                <Map size={16} className="text-gray-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Selesai / Diambil
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Customer mengambil pesanan di lokasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
