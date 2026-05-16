"use client";

import { ChevronLeft, Home, RefreshCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <MobileDeviceFrame backgroundClassName="bg-red-500">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-red-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="relative px-6 pt-10 pb-8 text-white">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-7 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            aria-label="Kembali"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(127,29,29,0.22)]">
            <XCircle size={52} className="text-red-500" />
          </div>

          <p className="mb-2 text-xs font-extrabold tracking-[0.24em] text-red-100 uppercase">
            Payment Failed
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Pembayaran
            <br />
            Belum Berhasil
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 font-medium text-red-50">
            Tidak ada order yang dibuat jika pembayaran gagal. Coba checkout
            ulang dari keranjang.
          </p>
        </section>

        <section className="flex-1 rounded-t-[40px] bg-[#f8fafc] px-5 pt-6 pb-8">
          <div className="mb-5 rounded-[28px] border border-red-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <h2 className="text-sm font-extrabold text-gray-950">
              Transaksi Tidak Tercatat
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Halaman ini tidak menampilkan data contoh. Jika order benar-benar
              gagal dibuat, invoice pembayaran tidak akan tersimpan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(239,68,68,0.24)]"
            >
              <RefreshCcw size={17} />
              Checkout Ulang
            </button>
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-gray-700"
            >
              <Home size={17} />
              Home
            </button>
          </div>
        </section>
      </div>
    </MobileDeviceFrame>
  );
}
