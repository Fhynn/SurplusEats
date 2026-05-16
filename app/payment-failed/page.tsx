"use client";

import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  HelpCircle,
  Home,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

type PaymentMethodId = "ewallet" | "card" | "bank";

const failedOrder = {
  id: "SFM-99A2X",
  restaurant: "Bakehouse Bakery",
  item: "Paket Roti Artisan Sourdough",
  pickup: "Hari ini, 19:00 - 20:00 WIB",
  subtotal: 15000,
  serviceFee: 2000,
};

const paymentMethods: {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}[] = [
  {
    id: "ewallet",
    label: "E-Wallet",
    description: "OVO, GoPay, DANA",
    icon: Smartphone,
    badge: "Disarankan",
  },
  {
    id: "card",
    label: "Kartu Debit",
    description: "Visa, Mastercard",
    icon: CreditCard,
  },
  {
    id: "bank",
    label: "Transfer Bank",
    description: "Virtual account",
    icon: Banknote,
  },
];

const failureReasons = [
  "Waktu pembayaran sudah melewati batas 15 menit.",
  "Stok restoran belum dikurangi karena transaksi tidak selesai.",
  "Tidak ada saldo yang terpotong dari akun pembayaranmu.",
] as const;

const total = failedOrder.subtotal + failedOrder.serviceFee;

export default function PaymentFailedPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodId>("ewallet");
  const [showSupport, setShowSupport] = useState(false);

  const handleRetry = () => {
    router.push(`/checkout?retry=${failedOrder.id}&method=${selectedMethod}`);
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-red-500">
      <div className="flex min-h-full flex-1 flex-col overflow-y-auto bg-red-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            Pesanan belum diproses. Kamu bisa mencoba ulang dengan metode yang
            sama atau mengganti metode pembayaran.
          </p>
        </section>

        <section className="flex-1 rounded-t-[40px] bg-[#f8fafc] px-5 pt-6 pb-8">
          <div className="mb-5 rounded-[28px] border border-red-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Transaksi Kedaluwarsa
                  </h2>
                  <p className="mt-1 font-mono text-[11px] font-bold text-gray-400">
                    {failedOrder.id}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-extrabold text-red-600">
                Gagal
              </span>
            </div>

            <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-950">
                    {failedOrder.item}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {failedOrder.restaurant}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold text-gray-950">
                  {formatRp(total)}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-600">
                <Clock3 size={16} className="text-amber-500" />
                Pickup tetap tersedia jika pembayaran selesai sebelum stok habis.
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {failureReasons.map((reason) => (
                <div key={reason} className="flex gap-3 text-xs font-medium text-gray-500">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span className="leading-5">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-gray-950">
                  Pilih Metode Retry
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Simulasi metode pembayaran untuk mencoba ulang checkout.
                </p>
              </div>
              <ShieldCheck size={22} className="text-emerald-500" />
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left transition-all ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.10)]"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      <Icon size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold text-gray-950">
                        {method.label}
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-gray-500">
                        {method.description}
                      </span>
                    </span>
                    {method.badge ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">
                        {method.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {showSupport ? (
            <div className="mb-5 rounded-[24px] border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <MessageCircle size={20} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-extrabold text-blue-950">
                    Bantuan pembayaran siap
                  </p>
                  <p className="mt-1 text-xs leading-5 font-medium text-blue-700">
                    Sertakan ID {failedOrder.id} saat menghubungi support agar
                    status transaksi bisa dicek lebih cepat.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRetry}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <RefreshCcw size={18} />
              Coba Bayar Lagi
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowSupport((current) => !current)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 py-3.5 text-sm font-extrabold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <HelpCircle size={17} />
                Bantuan
              </button>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Home size={17} />
                Beranda
              </button>
            </div>
          </div>
        </section>
      </div>
    </MobileDeviceFrame>
  );
}
