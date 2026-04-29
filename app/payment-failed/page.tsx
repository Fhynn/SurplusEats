"use client";

import { RefreshCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-red-50">
          <XCircle size={62} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
          Pembayaran Gagal
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-6 font-medium text-gray-500">
          Waktu bayar sudah habis. Pesanan belum diproses dan kamu bisa mencoba
          pembayaran lagi.
        </p>

        <div className="mt-10 w-full space-y-3">
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            <RefreshCcw size={18} />
            Coba Bayar Lagi
          </button>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
