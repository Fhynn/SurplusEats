"use client";

import Image from "next/image";
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  Clock3,
  MessageSquare,
  PackageCheck,
  QrCode,
  RefreshCcw,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type OrderStatus = "ready" | "preparing" | "completed" | "cancelled";

type CustomerOrder = {
  id: string;
  resto: string;
  items: string;
  total: number;
  status: OrderStatus;
  statusText: string;
  time: string;
  image: string;
  foodId?: number;
};

const activeOrders: CustomerOrder[] = [
  {
    id: "SFM-99A2X",
    resto: "Bakehouse Bakery",
    items: "Paket Roti Artisan Sourdough (x1)",
    total: 15000,
    status: "ready",
    statusText: "Siap Diambil",
    time: "Hari ini, 19:30",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop",
    foodId: 1,
  },
  {
    id: "SFM-88B1Y",
    resto: "Warteg Modern Bahari",
    items: "Nasi Ayam Bakar (x2)",
    total: 24000,
    status: "preparing",
    statusText: "Sedang Disiapkan",
    time: "Hari ini, 20:00",
    image:
      "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=600&auto=format&fit=crop",
    foodId: 2,
  },
];

const pastOrders: CustomerOrder[] = [
  {
    id: "SFM-77C0Z",
    resto: "Sushi Yay!",
    items: "Assorted Sushi Surplus (x1)",
    total: 35000,
    status: "completed",
    statusText: "Selesai",
    time: "Kemarin, 21:00",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop",
    foodId: 3,
  },
  {
    id: "SFM-66D9W",
    resto: "Kopi Kenangan Mantan",
    items: "Roti Coklat + Kopi Susu (x1)",
    total: 20000,
    status: "cancelled",
    statusText: "Dibatalkan",
    time: "18 Okt 2023, 18:00",
    image:
      "https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=600&auto=format&fit=crop",
    foodId: 2,
  },
];

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const statusClassNameByStatus: Record<OrderStatus, string> = {
  ready: "bg-emerald-50 text-emerald-600",
  preparing: "bg-blue-50 text-blue-600",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"aktif" | "selesai">("aktif");
  const [query, setQuery] = useState("");
  const [reviewOrder, setReviewOrder] = useState<CustomerOrder | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const orders = activeTab === "aktif" ? activeOrders : pastOrders;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOrders = orders.filter((order) => {
    if (!normalizedQuery) {
      return true;
    }

    return [order.id, order.resto, order.items, order.statusText]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const readyCount = activeOrders.filter((order) => order.status === "ready").length;
  const preparingCount = activeOrders.filter(
    (order) => order.status === "preparing",
  ).length;

  const handleOpenOrder = (order: CustomerOrder) => {
    if (order.status === "ready" || order.status === "preparing") {
      router.push(`/orders/${order.id}`);
    }
  };

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
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex min-h-full flex-1 flex-col bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-4 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                Order Center
              </p>
              <h1 className="mt-1 text-xl font-extrabold text-gray-900">
                Riwayat Pesanan
              </h1>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
              <p className="text-lg font-extrabold text-emerald-700">
                {activeOrders.length}
              </p>
              <p className="text-[10px] font-bold text-emerald-600">
                aktif
              </p>
            </div>
          </div>

          <div className="flex gap-4 border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setActiveTab("aktif");
                setQuery("");
              }}
              className={`relative pb-3 text-sm font-bold transition-all ${
                activeTab === "aktif" ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              Sedang Berjalan ({activeOrders.length})
              {activeTab === "aktif" ? (
                <span className="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-emerald-500" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("selesai");
                setQuery("");
              }}
              className={`relative pb-3 text-sm font-bold transition-all ${
                activeTab === "selesai" ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Selesai ({pastOrders.length})
              {activeTab === "selesai" ? (
                <span className="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-gray-900" />
              ) : null}
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari restoran, menu, atau ID..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pr-4 pl-11 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeTab === "aktif" ? (
            <section className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <PackageCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">
                    Pickup hari ini
                  </h2>
                  <p className="mt-1 text-xs leading-5 font-semibold text-emerald-800">
                    Cek status sebelum berangkat agar pesanan tidak melewati jam
                    pickup.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {readyCount}
                  </p>
                  <p className="text-[11px] font-bold text-gray-500">
                    siap diambil
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-lg font-extrabold text-blue-600">
                    {preparingCount}
                  </p>
                  <p className="text-[11px] font-bold text-gray-500">
                    disiapkan
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-700">
                  <CalendarClock size={22} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-950">
                    Arsip pesanan
                  </h2>
                  <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                    Buka ulasan, refund, atau pesan ulang dari riwayat yang
                    sudah selesai.
                  </p>
                </div>
              </div>
            </section>
          )}

          {visibleOrders.map((order) => {
            const isTrackable =
              order.status === "ready" || order.status === "preparing";

            return (
              <article
                key={order.id}
                onClick={isTrackable ? () => handleOpenOrder(order) : undefined}
                onKeyDown={
                  isTrackable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenOrder(order);
                        }
                      }
                    : undefined
                }
                role={isTrackable ? "button" : undefined}
                tabIndex={isTrackable ? 0 : undefined}
                className={`group relative w-full rounded-[24px] border border-gray-100 bg-white p-4 text-left shadow-sm transition-all ${
                  isTrackable
                    ? "cursor-pointer hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    : "cursor-default"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Store size={16} className="shrink-0 text-gray-400" />
                    <span className="truncate text-sm font-extrabold text-gray-900">
                      {order.resto}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
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
                      alt={order.items}
                      fill
                      sizes="72px"
                      className={`object-cover ${
                        order.status === "cancelled" ? "grayscale" : ""
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-bold text-gray-900">
                      {order.items}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-bold text-gray-400">
                      {order.id}
                    </p>
                    {isTrackable ? (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-600">
                        Ketuk kartu untuk melihat live tracking
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-gray-50 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                        <Clock3 size={12} />
                        {order.time}
                      </p>
                      <p className="text-sm font-extrabold text-gray-900">
                        {formatRp(order.total)}
                      </p>
                    </div>

                    {order.status === "ready" ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition-colors group-hover:bg-emerald-500">
                        <QrCode size={14} />
                        Ambil Pesanan
                      </span>
                    ) : null}

                    {order.status === "preparing" ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold whitespace-nowrap text-blue-600 transition-colors group-hover:bg-blue-100">
                        Lacak
                        <ChevronRight size={14} />
                      </span>
                    ) : null}
                  </div>

                  {order.status === "cancelled" ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/orders/${order.id}/refund`);
                      }}
                      className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <RefreshCcw size={14} />
                      Ajukan Refund
                    </button>
                  ) : null}

                  {order.status === "completed" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setReviewOrder(order);
                        }}
                        className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-2 text-[11px] font-extrabold whitespace-nowrap text-emerald-600 transition-colors hover:bg-emerald-50"
                      >
                        <MessageSquare size={13} />
                        Ulas
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/orders/${order.id}/refund`);
                        }}
                        className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-2 text-[11px] font-extrabold whitespace-nowrap text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        <RefreshCcw size={13} />
                        Refund
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/detail/${order.foodId ?? 1}`);
                        }}
                        className="col-span-2 flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-2 text-[12px] font-extrabold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-emerald-500"
                      >
                        <ShoppingBag size={13} />
                        Pesan Lagi
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}

          {visibleOrders.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                <Search size={24} />
              </div>
              <h2 className="text-base font-extrabold text-gray-950">
                Pesanan tidak ditemukan
              </h2>
              <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 font-medium text-gray-500">
                Coba cari dengan nama restoran, menu, status, atau ID pesanan
                lain.
              </p>
            </div>
          ) : null}
        </div>

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
                      {reviewOrder.resto}
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
                htmlFor="order-review-comment"
                className="mb-2 block text-sm font-extrabold text-gray-800"
              >
                Komentar (Opsional)
              </label>
              <textarea
                id="order-review-comment"
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
    </MobileDeviceFrame>
  );
}
