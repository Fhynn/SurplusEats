"use client";

import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { formatRp } from "@/lib/customer-data";

const voucherSuggestions = ["SURPLUS5", "HEMAT10"] as const;

export function CustomerCartScreen() {
  const router = useRouter();
  const {
    cart,
    cartCount,
    cartTotal,
    originalTotal,
    totalSaved,
    updateCartQty,
    clearCart,
  } = useCustomerApp();
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState("");
  const [isClearOpen, setIsClearOpen] = useState(false);
  const serviceFee = 2000;
  const voucherDiscount = appliedVoucher ? 5000 : 0;
  const grandTotal = Math.max(0, cartTotal + serviceFee - voucherDiscount);
  const foodSavedKg = (cartCount * 0.8).toFixed(1);

  const handleApplyVoucher = () => {
    const normalizedCode = voucherCode.trim().toUpperCase();

    if (!normalizedCode) {
      return;
    }

    setAppliedVoucher(normalizedCode);
    setVoucherCode(normalizedCode);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-32">
        <header className="sticky top-0 z-20 flex items-center bg-white/90 px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke beranda"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="ml-2 text-xl font-extrabold text-gray-900">
            Keranjang Saya
          </h1>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[32px] bg-emerald-50 text-emerald-500">
            <ShoppingBag size={46} />
          </div>
          <h2 className="mb-2 text-xl font-extrabold text-gray-900">
            Keranjangmu Kosong
          </h2>
          <p className="mb-8 max-w-xs text-sm leading-6 font-medium text-gray-500">
            Cari makanan surplus terdekat dan tambahkan ke keranjang sebelum
            lanjut checkout.
          </p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="rounded-2xl bg-emerald-500 px-8 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(16,185,129,0.24)] transition-all active:scale-[0.98]"
          >
            Cari Makanan
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-50">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke beranda"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <div className="ml-2">
            <h1 className="text-xl font-extrabold text-gray-900">
              Keranjang Saya
            </h1>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              {cartCount} item siap checkout
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsClearOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100"
          aria-label="Kosongkan keranjang"
        >
          <Trash2 size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-56 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="mb-5 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                Cart Impact
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-emerald-950">
                {foodSavedKg} Kg terselamatkan
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <Leaf size={27} />
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
              Pickup
              <span className="mt-1 block text-sm font-extrabold text-gray-950">
                Malam ini
              </span>
            </div>
          </div>
        </section>

        <section className="mb-5 space-y-4">
          {cart.map((item) => (
            <article
              key={item.id}
              className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[20px]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                  <span className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-extrabold text-amber-600 backdrop-blur">
                    {item.stock} stok
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm leading-tight font-extrabold text-gray-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-500">
                        <Store size={12} />
                        {item.restaurant}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -item.qty)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label={`Hapus ${item.name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 line-through">
                        {formatRp(item.originalPrice)}
                      </p>
                      <p className="text-sm font-extrabold text-emerald-600">
                        {formatRp(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-full border border-gray-100 bg-gray-50 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
                        aria-label={`Kurangi ${item.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-xs font-extrabold text-gray-900">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                        aria-label={`Tambah ${item.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mb-5 rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TicketPercent size={19} className="text-emerald-500" />
            <h2 className="text-sm font-extrabold text-gray-950">
              Voucher Keranjang
            </h2>
          </div>
          <div className="mb-3 flex gap-2">
            <input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="Kode voucher"
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold uppercase text-gray-900 outline-none placeholder:font-medium placeholder:normal-case placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleApplyVoucher}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500"
            >
              Pakai
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {voucherSuggestions.map((voucher) => (
              <button
                key={voucher}
                type="button"
                onClick={() => {
                  setVoucherCode(voucher);
                  setAppliedVoucher(voucher);
                }}
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
                  appliedVoucher === voucher
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {voucher}
              </button>
            ))}
          </div>
          {appliedVoucher ? (
            <p className="mt-3 text-xs font-bold text-emerald-600">
              Voucher {appliedVoucher} aktif: diskon {formatRp(voucherDiscount)}.
            </p>
          ) : null}
        </section>

        <section className="mb-5 rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={19} className="text-blue-500" />
            <h2 className="text-sm font-extrabold text-gray-950">
              Catatan Pickup
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3 text-xs font-medium text-gray-500">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span className="leading-5">
                Pastikan datang sesuai jam pickup. Stok surplus terbatas dan
                diproses berdasarkan checkout berhasil.
              </span>
            </div>
            <div className="flex gap-3 text-xs font-medium text-gray-500">
              <Leaf size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <span className="leading-5">
                Semua item di keranjang berasal dari makanan layak konsumsi yang
                diselamatkan dari potensi food waste.
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-extrabold text-gray-950">
            Ringkasan Pesanan
          </h2>
          <div className="space-y-3 text-xs font-medium">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Asli</span>
              <span className="line-through">{formatRp(originalTotal)}</span>
            </div>
            <div className="flex justify-between rounded-xl border border-emerald-100/50 bg-emerald-50 px-3 py-2 font-bold text-emerald-600">
              <span className="flex items-center gap-1.5">
                <Leaf size={14} className="fill-emerald-200" />
                Diskon Surplus
              </span>
              <span>- {formatRp(totalSaved)}</span>
            </div>
            {appliedVoucher ? (
              <div className="flex justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 font-bold text-blue-600">
                <span>Voucher {appliedVoucher}</span>
                <span>- {formatRp(voucherDiscount)}</span>
              </div>
            ) : null}
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
      </main>

      <div className="absolute right-0 bottom-20 left-0 z-40 border-t border-gray-100 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Checkout</p>
            <p className="text-xl font-extrabold text-gray-950">
              {formatRp(grandTotal)}
            </p>
          </div>
          <p className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-600">
            Hemat {formatRp(totalSaved + voucherDiscount)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
        >
          Lanjut Pembayaran
          <ArrowRight size={18} />
        </button>
      </div>

      {isClearOpen ? (
        <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm">
          <div className="w-full rounded-t-[36px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />
            <h2 className="text-xl font-extrabold text-gray-950">
              Kosongkan keranjang?
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Semua item surplus yang sudah dipilih akan dihapus dari keranjang.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsClearOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setIsClearOpen(false);
                }}
                className="rounded-2xl bg-red-500 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-red-600"
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
