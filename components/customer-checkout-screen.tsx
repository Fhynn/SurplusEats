"use client";

import Image from "next/image";
import {
  Banknote,
  ChevronLeft,
  Clock3,
  CreditCard,
  Leaf,
  MapPin,
  MessageSquareText,
  ReceiptText,
  Store,
  TicketPercent,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const pickupOptions = [
  {
    id: "early",
    time: "19:00 - 20:00",
    label: "Paling aman",
    description: "Ambil lebih awal agar kualitas makanan tetap optimal.",
  },
  {
    id: "late",
    time: "20:00 - 21:00",
    label: "Setelah kerja",
    description: "Cocok untuk pickup setelah jam pulang.",
  },
] as const;

const paymentOptions: {
  id: "gopay" | "qris" | "va";
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
}[] = [
  {
    id: "gopay",
    title: "GoPay",
    subtitle: "Bebas biaya admin",
    icon: Wallet,
    iconClassName: "bg-emerald-100/60 text-emerald-600",
  },
  {
    id: "qris",
    title: "QRIS",
    subtitle: "OVO, DANA, ShopeePay",
    icon: CreditCard,
    iconClassName: "bg-blue-100/60 text-blue-600",
  },
  {
    id: "va",
    title: "Virtual Account",
    subtitle: "BCA, Mandiri, BRI",
    icon: Banknote,
    iconClassName: "bg-amber-100/60 text-amber-600",
  },
];

const serviceFee = 2000;

export function CustomerCheckoutScreen() {
  const router = useRouter();
  const { cart, cartCount, cartTotal, originalTotal, totalSaved, clearCart } =
    useCustomerApp();
  const [pickupTime, setPickupTime] =
    useState<(typeof pickupOptions)[number]["id"]>("early");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentOptions)[number]["id"]>("gopay");
  const [notes, setNotes] = useState("");
  const [agreePickup, setAgreePickup] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const grandTotal = Math.max(0, cartTotal + serviceFee);
  const selectedPickup = pickupOptions.find((item) => item.id === pickupTime);

  const handlePaymentSuccess = async () => {
    if (cart.length === 0 || isSubmittingOrder) {
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutNotice(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.qty,
          })),
          note: notes.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        order?: {
          orderCode: string;
        };
      };

      if (!response.ok || !data.ok || !data.order) {
        throw new Error(data.message || "Checkout gagal.");
      }

      clearCart();
      router.push(`/payment-success?order=${data.order.orderCode}`);
    } catch (error) {
      setCheckoutNotice(
        error instanceof Error ? error.message : "Checkout gagal.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
        <header className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke keranjang"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <div className="ml-2">
            <h1 className="text-xl font-extrabold text-gray-900">Checkout</h1>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              Konfirmasi pickup dan pembayaran.
            </p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-64 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-emerald-50 text-emerald-600">
                <ReceiptText size={38} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Belum ada pesanan
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Tambahkan makanan ke keranjang dulu sebelum lanjut checkout.
              </p>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-white"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                      Ready to Save
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold text-emerald-950">
                      {cartCount} item surplus
                    </h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <Leaf size={28} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                  <div className="rounded-2xl bg-white px-3 py-3 text-gray-600">
                    Hemat
                    <span className="mt-1 block text-sm font-extrabold text-gray-950">
                      {formatRp(totalSaved)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 text-gray-600">
                    Food saved
                    <span className="mt-1 block text-sm font-extrabold text-gray-950">
                      {(cartCount * 0.8).toFixed(1)} Kg
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin size={19} className="text-emerald-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Lokasi Pickup
                  </h2>
                </div>
                <div className="rounded-[22px] border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-extrabold text-gray-950">
                    Pickup di restoran
                  </p>
                  <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                    Alamat pickup mengikuti restoran pada item yang kamu
                    checkout. Detail lokasi muncul di tracking order setelah
                    checkout berhasil.
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock3 size={19} className="text-amber-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Waktu Pickup
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {pickupOptions.map((option) => {
                    const isActive = pickupTime === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPickupTime(option.id)}
                        className={`rounded-[22px] border p-4 text-left transition-all ${
                          isActive
                            ? "border-amber-200 bg-amber-50 ring-4 ring-amber-500/10"
                            : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-sm font-extrabold text-gray-950">
                            {option.time}
                          </p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-amber-600">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs leading-5 font-medium text-gray-500">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Store size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Item Pesanan
                  </h2>
                </div>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[20px] bg-gray-50 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-extrabold text-gray-950">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                          {item.restaurant} • Qty {item.qty}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-extrabold text-gray-950">
                        {formatRp(item.price * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquareText size={19} className="text-blue-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Catatan Restoran
                  </h2>
                </div>
                <textarea
                  placeholder="Cth: Tolong sambalnya dipisah ya, terima kasih..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TicketPercent size={19} className="text-emerald-500" />
                    <h2 className="text-sm font-extrabold text-gray-950">
                      Voucher
                    </h2>
                  </div>
                </div>
                <p className="text-xs leading-5 font-medium text-gray-500">
                  Voucher diterapkan dari keranjang jika kode voucher valid dari
                  database.
                </p>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Metode Pembayaran
                  </h2>
                </div>
                <div className="space-y-3">
                  {paymentOptions.map((option) => {
                    const isActive = paymentMethod === option.id;
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`flex w-full items-center justify-between rounded-[22px] border bg-white p-4 text-left transition-all ${
                          isActive
                            ? "border-emerald-200 ring-4 ring-emerald-500/10"
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`rounded-xl p-2.5 ${option.iconClassName}`}>
                            <Icon size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-extrabold text-gray-900">
                              {option.title}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">
                              {option.subtitle}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`h-5 w-5 shrink-0 rounded-full border-[5px] transition-colors ${
                            isActive
                              ? "border-emerald-500 bg-white"
                              : "border-gray-200 bg-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ReceiptText size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Ringkasan Pembayaran
                  </h2>
                </div>
                <div className="space-y-3 text-xs font-medium">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Asli</span>
                    <span className="line-through">{formatRp(originalTotal)}</span>
                  </div>
                  <div className="flex justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-bold text-emerald-600">
                    <span>Diskon Surplus</span>
                    <span>- {formatRp(totalSaved)}</span>
                  </div>
                  <div className="flex justify-between px-1 text-gray-600">
                    <span>Biaya Layanan</span>
                    <span>{formatRp(serviceFee)}</span>
                  </div>
                  <div className="my-2 h-px w-full bg-gray-100" />
                  <div className="flex justify-between px-1 text-lg font-extrabold text-gray-900">
                    <span>Total</span>
                    <span>{formatRp(grandTotal)}</span>
                  </div>
                </div>
              </section>

              <label className="flex cursor-pointer gap-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                <input
                  type="checkbox"
                  checked={agreePickup}
                  onChange={(event) => setAgreePickup(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-500"
                />
                <span className="text-xs leading-5 font-medium text-gray-500">
                  Saya paham pesanan surplus harus diambil sesuai jam pickup dan
                  QR perlu ditunjukkan ke kasir.
                </span>
              </label>
            </div>
          )}
        </main>

        {cart.length > 0 ? (
          <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-[32px] border-t border-gray-50 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
            {checkoutNotice ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {checkoutNotice}
              </div>
            ) : null}
            <div className="mb-4 flex items-start justify-between gap-4 px-1">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total Pembayaran
                </p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">
                  {formatRp(grandTotal)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400">
                  Pickup restoran
                </p>
                <p className="mt-1 text-xs font-extrabold text-emerald-600">
                  {selectedPickup?.time}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!agreePickup || isSubmittingOrder}
              onClick={handlePaymentSuccess}
              className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              {isSubmittingOrder ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
