"use client";

import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  RefreshCcw,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatRp } from "@/lib/customer-data";

type HistoryOrderStatus = "completed" | "cancelled";

type HistoryOrder = {
  id: string;
  restaurant: string;
  item: string;
  qty: number;
  total: number;
  time: string;
  status: HistoryOrderStatus;
  statusText: string;
  image: string;
  foodId: number;
  note: string;
};

const historyOrders: HistoryOrder[] = [
  {
    id: "SFM-77C0Z",
    restaurant: "Sushi Yay!",
    item: "Assorted Sushi Surplus",
    qty: 1,
    total: 35000,
    time: "Kemarin, 21:00",
    status: "completed",
    statusText: "Selesai",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=300&auto=format&fit=crop",
    foodId: 3,
    note: "Pickup selesai tanpa komplain.",
  },
  {
    id: "SFM-99A2X",
    restaurant: "Bakehouse Bakery",
    item: "Paket Roti Artisan Sourdough",
    qty: 1,
    total: 15000,
    time: "21 Okt 2023, 19:30",
    status: "completed",
    statusText: "Selesai",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=300&auto=format&fit=crop",
    foodId: 1,
    note: "Kamu menyelamatkan sekitar 0.8 kg makanan.",
  },
  {
    id: "SFM-66D9W",
    restaurant: "Kopi Kenangan Mantan",
    item: "Roti Coklat + Kopi Susu",
    qty: 1,
    total: 20000,
    time: "18 Okt 2023, 18:00",
    status: "cancelled",
    statusText: "Dibatalkan",
    image:
      "https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=300&auto=format&fit=crop",
    foodId: 2,
    note: "Pembayaran tidak selesai sebelum batas waktu.",
  },
];

const statusClassNameByStatus: Record<HistoryOrderStatus, string> = {
  completed: "border-emerald-100 bg-emerald-50 text-emerald-700",
  cancelled: "border-red-100 bg-red-50 text-red-600",
};

export function CustomerHistoryScreen() {
  const router = useRouter();
  const [reviewOrder, setReviewOrder] = useState<HistoryOrder | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return historyOrders;
    }

    return historyOrders.filter((order) =>
      [order.restaurant, order.item, order.id]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const handleCloseReview = () => {
    setReviewOrder(null);
    setRating(0);
    setReviewComment("");
  };

  const handleSubmitReview = () => {
    if (rating <= 0) {
      return;
    }

    handleCloseReview();
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-50">
      <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="mb-5 flex items-center">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <div className="ml-2">
            <h1 className="text-xl font-extrabold text-gray-900">
              Riwayat Pesanan
            </h1>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              Pesanan selesai, batal, refund, dan ulasan.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari restoran, menu, atau ID..."
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pr-4 pl-11 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-6 pt-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filteredOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Store size={16} className="shrink-0 text-gray-400" />
                <span className="truncate text-sm font-extrabold text-gray-900">
                  {order.restaurant}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${
                  statusClassNameByStatus[order.status]
                }`}
              >
                {order.statusText}
              </span>
            </div>

            <div className="mb-4 flex gap-4">
              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                <Image
                  src={order.image}
                  alt={order.item}
                  fill
                  sizes="72px"
                  className={`object-cover ${
                    order.status === "cancelled" ? "grayscale" : ""
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-sm leading-snug font-bold text-gray-900">
                  {order.item} (x{order.qty})
                </h2>
                <p className="mt-1 font-mono text-[10px] font-bold text-gray-400">
                  {order.id}
                </p>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 font-medium text-gray-500">
                  {order.note}
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] text-gray-400">
                    {order.time}
                  </p>
                  <p
                    className={`text-sm font-extrabold ${
                      order.status === "cancelled"
                        ? "text-gray-500 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {formatRp(order.total)}
                  </p>
                </div>
                {order.status === "completed" ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={12} />
                    Bisa diulas
                  </span>
                ) : null}
              </div>

              {order.status === "completed" ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewOrder(order)}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-2 text-[11px] font-extrabold whitespace-nowrap text-emerald-600 transition-colors hover:bg-emerald-50"
                  >
                    <MessageSquare size={13} />
                    Ulas
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${order.id}/refund`)}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-2 text-[11px] font-extrabold whitespace-nowrap text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <RefreshCcw size={13} />
                    Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/detail/${order.foodId}`)}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-gray-900 px-2 text-[11px] font-extrabold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-emerald-500"
                  >
                    <ShoppingBag size={13} />
                    Pesan Lagi
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${order.id}/refund`)}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-extrabold text-blue-600 transition-colors hover:bg-blue-100"
                >
                  <RefreshCcw size={14} />
                  Ajukan Refund
                </button>
              )}
            </div>
          </article>
        ))}

        {filteredOrders.length === 0 ? (
          <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-extrabold text-gray-900">
              Riwayat tidak ditemukan
            </p>
            <p className="mt-1 text-xs font-medium text-gray-500">
              Coba kata kunci restoran, menu, atau ID lain.
            </p>
          </div>
        ) : null}
      </main>

      {reviewOrder ? (
        <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm">
          <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                  <MessageSquare size={22} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold tracking-tight text-gray-950">
                    Beri Ulasan Restoran
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                    {reviewOrder.restaurant}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Tutup ulasan"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-500">
                <AlertCircle size={14} className="text-emerald-500" />
                Bagaimana pengalaman pickup kamu?
              </div>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isSelected = starValue <= rating;

                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      className="rounded-2xl p-2 transition-transform active:scale-90"
                      aria-label={`Pilih rating ${starValue}`}
                    >
                      <Star
                        size={34}
                        className={
                          isSelected
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <label
              htmlFor="review-comment"
              className="mb-2 block text-sm font-extrabold text-gray-800"
            >
              Komentar (Opsional)
            </label>
            <textarea
              id="review-comment"
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Ceritakan pengalamanmu..."
              rows={4}
              className="mb-5 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={rating <= 0}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none"
            >
              Kirim Ulasan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
