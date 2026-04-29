"use client";

import Image from "next/image";
import { ArrowRight, Leaf, Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCustomerApp } from "@/components/customer-app-provider";
import { formatRp } from "@/lib/customer-data";

export function CustomerCartScreen() {
  const router = useRouter();
  const { cart, cartTotal, totalSaved, updateCartQty } = useCustomerApp();
  const serviceFee = 2000;
  const grandTotal = cartTotal + serviceFee;

  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-32">
        <div className="sticky top-0 z-20 flex items-center justify-center bg-white/90 px-6 pt-10 pb-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
          <h1 className="text-xl font-extrabold text-gray-900">
            Keranjang Saya
          </h1>
        </div>

        <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
            <ShoppingBag size={40} className="text-emerald-500" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            Keranjangmu Kosong
          </h2>
          <p className="mb-8 text-sm text-gray-500">
            Yuk, cari makanan surplus di sekitarmu yang bisa diselamatkan hari
            ini!
          </p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-white shadow-[0_12px_26px_rgba(16,185,129,0.24)]"
          >
            Cari Makanan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-32">
      <div className="sticky top-0 z-20 flex items-center justify-center bg-white/90 px-6 pt-10 pb-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
        <h1 className="text-xl font-extrabold text-gray-900">
          Keranjang Saya
        </h1>
      </div>

      <div className="mt-6 px-6">
        <div className="mb-6 space-y-4">
          {cart.map((item) => (
            <article
              key={item.id}
              className="flex gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                  <h3 className="line-clamp-1 text-sm leading-tight font-bold text-gray-900">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {item.restaurant}
                  </p>
                </div>

                <div className="mt-2 flex items-end justify-between">
                  <p className="text-sm font-extrabold text-emerald-600">
                    {formatRp(item.price)}
                  </p>

                  <div className="flex items-center gap-3 rounded-full border border-gray-100 bg-gray-50 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                      aria-label={`Kurangi ${item.name}`}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-4 text-center text-xs font-bold">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mb-6 rounded-[24px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h3 className="mb-4 text-sm font-bold text-gray-900">
            Ringkasan Pesanan
          </h3>

          <div className="space-y-3 text-xs font-medium">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Asli</span>
              <span className="line-through">
                {formatRp(cartTotal + totalSaved)}
              </span>
            </div>
            <div className="flex justify-between rounded-xl border border-emerald-100/50 bg-emerald-50 px-3 py-2 font-bold text-emerald-600">
              <span className="flex items-center gap-1.5">
                <Leaf size={14} className="fill-emerald-200" />
                Food Saved Diskon
              </span>
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

        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all active:scale-95"
        >
          Lanjut Pembayaran
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
