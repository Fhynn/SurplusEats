"use client";

import { CheckCircle2, ChevronLeft, CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const PICKUP_OPTIONS = ["19:00 - 20:00", "20:00 - 21:00"] as const;
const PAYMENT_OPTIONS = [
  {
    id: "gopay",
    title: "GoPay",
    subtitle: "Bebas biaya admin",
    icon: Wallet,
    iconClassName: "bg-emerald-100/50 text-emerald-600",
  },
  {
    id: "qris",
    title: "QRIS / Transfer Bank",
    subtitle: "Ovo, Dana, BCA, Mandiri",
    icon: CreditCard,
    iconClassName: "bg-blue-100/50 text-blue-600",
  },
] as const;

export function CustomerCheckoutScreen() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCustomerApp();
  const [pickupTime, setPickupTime] =
    useState<(typeof PICKUP_OPTIONS)[number]>("19:00 - 20:00");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_OPTIONS)[number]["id"]>("gopay");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const serviceFee = 2000;
  const grandTotal = cartTotal + serviceFee;

  if (isSuccess) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-emerald-500">
        <div className="flex flex-1 flex-col items-center justify-center bg-emerald-500 px-6">
          <div className="mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-extrabold text-white">
            Yey! Pembayaran
            <br />
            Berhasil
          </h1>
          <p className="mb-10 text-center text-sm text-emerald-50">
            Pesananmu akan segera disiapkan oleh restoran.
          </p>
          <button
            type="button"
            onClick={() => {
              clearCart();
              router.push("/tracking");
            }}
            className="w-full rounded-2xl bg-white px-8 py-4 font-bold text-emerald-600 shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all active:scale-95"
          >
            Lanjut Tracking Pesanan
          </button>
        </div>
      </MobileDeviceFrame>
    );
  }

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex h-full flex-1 flex-col bg-gray-50">
        <div className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke keranjang"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="ml-2 text-xl font-extrabold text-gray-900">Checkout</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24">
          {cart.length === 0 ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h2 className="text-lg font-bold text-gray-900">
                Belum ada pesanan
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Tambahkan makanan ke keranjang dulu sebelum lanjut checkout.
              </p>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-bold text-gray-900">
                Waktu Pickup
              </h3>
              <div className="mb-8 grid grid-cols-2 gap-3">
                {PICKUP_OPTIONS.map((option) => {
                  const isActive = pickupTime === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPickupTime(option)}
                      className={`rounded-2xl border-2 py-3 text-sm font-bold ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-100 bg-white text-gray-500"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <h3 className="mb-3 text-sm font-bold text-gray-900">
                Catatan untuk Restoran
              </h3>
              <textarea
                placeholder="Cth: Tolong sambalnya dipisah ya, terima kasih..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="mb-8 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.03)] outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
              />

              <h3 className="mb-3 text-sm font-bold text-gray-900">
                Metode Pembayaran
              </h3>
              <div className="mb-8 space-y-3">
                {PAYMENT_OPTIONS.map((option) => {
                  const isActive = paymentMethod === option.id;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPaymentMethod(option.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border-2 bg-white p-4 text-left ${
                        isActive
                          ? "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                          : "border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`rounded-xl p-2.5 ${option.iconClassName}`}>
                          <Icon size={20} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-gray-900">
                            {option.title}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400">
                            {option.subtitle}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`h-5 w-5 rounded-full border-[5px] transition-colors ${
                          isActive
                            ? "border-emerald-500 bg-white"
                            : "border-gray-200 bg-transparent"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {cart.length > 0 ? (
          <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-[32px] border-t border-gray-50 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between px-1">
              <span className="text-sm font-medium text-gray-500">
                Total Pembayaran
              </span>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                {formatRp(grandTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSuccess(true)}
              className="w-full rounded-2xl bg-gray-900 py-4 font-bold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98]"
            >
              Bayar Sekarang
            </button>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
