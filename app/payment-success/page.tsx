"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Home,
  Leaf,
  Navigation,
  PackageCheck,
  QrCode,
  ReceiptText,
  Share2,
  Store,
} from "lucide-react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const orderId = "SFM-99A2X";
const orderItems = [
  {
    name: "Paket Roti Artisan Sourdough",
    qty: 1,
    price: 15000,
  },
] as const;

const subtotal = 15000;
const serviceFee = 2000;
const voucherDiscount = 5000;
const total = subtotal + serviceFee - voucherDiscount;

const timeline = [
  {
    title: "Pembayaran berhasil",
    description: "Transaksi sudah tercatat dan restoran menerima order.",
    time: "19:05",
    icon: CheckCircle2,
    isActive: false,
  },
  {
    title: "Pesanan diproses",
    description: "Owner menyiapkan makanan surplus sesuai detail checkout.",
    time: "19:10",
    icon: PackageCheck,
    isActive: true,
  },
  {
    title: "Pickup dengan QR",
    description: "Tunjukkan QR ke kasir saat sampai di toko.",
    time: "19:00 - 20:00",
    icon: QrCode,
    isActive: false,
  },
] as const;

export default function PaymentSuccessPage() {
  const [notice, setNotice] = useState("");

  const handleAction = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2000);
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-emerald-500">
      <div className="flex min-h-full flex-1 flex-col overflow-y-auto bg-emerald-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="px-6 pt-12 pb-8 text-center text-white">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
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
            Pesananmu sudah diteruskan ke restoran. Simpan QR pickup untuk
            validasi saat ambil makanan.
          </p>
        </section>

        <section className="flex-1 rounded-t-[40px] bg-[#f8fafc] px-5 pt-6 pb-8">
          {notice ? (
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-xs font-extrabold text-blue-700">
              {notice}
            </div>
          ) : null}

          <div className="mb-5 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ReceiptText size={22} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Struk Pesanan
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-gray-400">
                    {orderId}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAction("ID order disalin di prototype.")}
                  className="rounded-xl bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  aria-label="Salin ID order"
                >
                  <Copy size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleAction("Struk siap diunduh di prototype.")}
                  className="rounded-xl bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  aria-label="Download struk"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-[1fr_auto] gap-4 rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
                  Pickup QR
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-emerald-950">
                  Tunjukkan ke kasir
                </h3>
                <p className="mt-1 text-xs leading-5 font-medium text-emerald-700">
                  QR ini dipakai untuk memvalidasi order saat kamu sampai di
                  Bakehouse Bakery.
                </p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-gray-900 shadow-sm">
                <QrCode size={68} />
              </div>
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
              <a
                href="https://www.google.com/maps/search/?api=1&query=Bakehouse%20Bakery"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-extrabold text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Navigation size={15} />
                Arahkan Lokasi
              </a>
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
              <div className="flex justify-between text-sm font-medium text-blue-600">
                <span>Voucher SURPLUS5</span>
                <span>- {formatRp(voucherDiscount)}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                <span>Total Dibayar</span>
                <span>{formatRp(total)}</span>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-gray-950">
                  Status Pesanan
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Timeline awal setelah pembayaran berhasil.
                </p>
              </div>
              <PackageCheck size={22} className="text-emerald-500" />
            </div>

            <div className="relative space-y-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gray-100">
              {timeline.map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="relative flex gap-4">
                    <div
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ${
                        step.isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div
                      className={`flex-1 rounded-2xl p-4 ${
                        step.isActive
                          ? "border border-emerald-100 bg-emerald-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {step.title}
                        </h3>
                        <span className="text-[10px] font-extrabold text-gray-400">
                          {step.time}
                        </span>
                      </div>
                      <p className="text-xs leading-5 font-medium text-gray-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                  Kamu ikut menyelamatkan 0.8 kg makanan dan 1.7 kg CO2e.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAction("Order siap dibagikan di prototype.")}
              className="self-center rounded-2xl bg-gray-50 p-3 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              aria-label="Bagikan order"
            >
              <Share2 size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <Link
              href={`/orders/${orderId}`}
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
