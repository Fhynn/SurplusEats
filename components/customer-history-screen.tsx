"use client";

import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerHistoryScreen() {
  const router = useRouter();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const handleCloseReview = () => {
    setIsReviewOpen(false);
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
      <div className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Kembali"
        >
          <ChevronLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="ml-2 text-xl font-extrabold text-gray-900">
          Riwayat Pesanan
        </h1>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 pt-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-gray-500 uppercase">
              21 Okt 2023 • 19:30
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-100/50 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.06)]">
              <CheckCircle2 size={12} />
              Selesai
            </span>
          </div>

          <div className="mb-5 flex gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
              <Image
                src="https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop"
                alt="Paket Roti Artisan Sourdough"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="line-clamp-1 text-sm leading-snug font-bold text-gray-900">
                Paket Roti Artisan Sourdough
              </h2>
              <p className="mt-0.5 mb-1.5 text-xs font-medium text-gray-500">
                Bakehouse Bakery
              </p>
              <p className="text-sm font-extrabold text-gray-900">
                Rp 15.000
                <span className="ml-1 text-[10px] font-medium text-gray-400">
                  x1
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-dashed border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-500 bg-white py-2.5 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-50 active:scale-95"
            >
              <MessageSquare size={14} />
              Beri Ulasan
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-all hover:bg-emerald-500 active:scale-95"
            >
              Pesan Lagi
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-100 bg-white p-4 opacity-75 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-gray-500 uppercase">
              18 Okt 2023 • 20:15
            </span>
            <span className="rounded-lg border border-red-100/50 bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700">
              Dibatalkan
            </span>
          </div>

          <div className="flex gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=200&auto=format&fit=crop"
                alt="Nasi Ayam Bakar Spesial"
                fill
                sizes="64px"
                className="object-cover grayscale"
              />
            </div>
            <div className="flex-1">
              <h2 className="line-clamp-1 text-sm leading-snug font-bold text-gray-900">
                Nasi Ayam Bakar Spesial
              </h2>
              <p className="mt-0.5 mb-1.5 text-xs font-medium text-gray-500">
                Warteg Modern Bahari
              </p>
              <p className="text-sm font-extrabold text-gray-900 line-through">
                Rp 12.000
              </p>
            </div>
          </div>
        </div>
      </div>

      {isReviewOpen ? (
        <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm">
          <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                  <MessageSquare size={22} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-gray-950">
                    Beri Ulasan Restoran
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-gray-500">
                    Bakehouse Bakery
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
