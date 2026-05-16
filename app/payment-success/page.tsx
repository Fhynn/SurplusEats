"use client";

import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  Home,
  Leaf,
  QrCode,
  ReceiptText,
  Store,
} from "lucide-react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const orderItems = [
  {
    name: "Paket Roti Artisan Sourdough",
    qty: 1,
    price: 15000,
  },
] as const;

const subtotal = 15000;
const serviceFee = 2000;
const total = subtotal + serviceFee;

export default function PaymentSuccessPage() {
  return (
    <MobileDeviceFrame backgroundClassName="bg-emerald-500">
      <div className="flex min-h-full flex-1 flex-col overflow-y-auto bg-emerald-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="px-6 pt-12 pb-8 text-center text-white">
          <div className="mx-auto mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
            <CheckCircle2 size={50} className="text-emerald-500" />
          </div>
          <p className="mb-2 text-xs font-extrabold tracking-[0.24em] text-emerald-100 uppercase">
            Payment Success
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Pembayaran
            <br />
            Berhasil
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 font-medium text-emerald-50">
            Pesananmu sudah diteruskan ke restoran dan akan segera disiapkan.
          </p>
        </section>

        <section className="flex-1 rounded-t-[40px] bg-[#f8fafc] px-5 pt-6 pb-8">
          <div className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ReceiptText size={22} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Struk Pesanan
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-gray-400">
                    SFM-99A2X
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                aria-label="Download struk"
              >
                <Download size={18} />
              </button>
            </div>

            <div className="space-y-3 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <Store size={18} className="mt-0.5 text-gray-400" />
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    Bakehouse Bakery
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Pickup di Jl. Sudirman No. 45, Pekanbaru
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarClock size={18} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-600">
                  Hari ini, 19:00 - 20:00 WIB
                </p>
              </div>
            </div>

            <div className="my-5 space-y-3">
              {orderItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-gray-400">
                      Qty {item.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold text-gray-900">
                    {formatRp(item.price)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-dashed border-gray-200 pt-4">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span>{formatRp(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Biaya Layanan</span>
                <span>{formatRp(serviceFee)}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                <span>Total Dibayar</span>
                <span>{formatRp(total)}</span>
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-[1fr_auto] gap-3 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Leaf size={22} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-950">
                  Food saved tercatat
                </p>
                <p className="text-xs font-medium text-gray-500">
                  Kamu ikut menyelamatkan 0.8 kg makanan.
                </p>
              </div>
            </div>
            <QrCode size={42} className="self-center text-gray-900" />
          </div>

          <div className="space-y-3">
            <Link
              href="/orders/SFM-99A2X"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              Lanjut Tracking Pesanan
              <ChevronRight size={18} />
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/orders"
                className="rounded-2xl border border-gray-200 bg-white py-3.5 text-center text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Riwayat
              </Link>
              <Link
                href="/home"
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-3.5 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Home size={17} />
                Beranda
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MobileDeviceFrame>
  );
}
