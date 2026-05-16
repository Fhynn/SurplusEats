"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Send,
  Star,
  ThumbsUp,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ReviewStatus = "new" | "replied";

type OwnerReview = {
  id: string;
  customer: string;
  menu: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
  orderId: string;
  reply?: string;
};

const reviews: OwnerReview[] = [
  {
    id: "REV-1041",
    customer: "Alfhin Pratama",
    menu: "Paket Roti Artisan Sourdough",
    rating: 5,
    comment:
      "Roti masih enak dan pickup sangat cepat. Kasir juga langsung paham saat saya tunjukkan QR.",
    date: "Hari ini, 19:48",
    status: "new",
    orderId: "SFM-99A2X",
  },
  {
    id: "REV-1038",
    customer: "Maya Lestari",
    menu: "Croissant Butter Box",
    rating: 4,
    comment:
      "Produk bagus, hanya antrean pickup agak ramai. Tetap worth it untuk harga segini.",
    date: "Kemarin, 20:12",
    status: "new",
    orderId: "SFM-77C0Z",
  },
  {
    id: "REV-1034",
    customer: "Budi Santoso",
    menu: "Donut Cokelat",
    rating: 5,
    comment:
      "Donutnya masih lembut. Anak-anak suka, dan saya senang bisa bantu kurangi food waste.",
    date: "14 Mei 2026, 18:40",
    status: "replied",
    orderId: "SFM-66D9W",
    reply:
      "Terima kasih banyak, Kak Budi. Kami tunggu pickup berikutnya di Bakehouse Bakery.",
  },
  {
    id: "REV-1029",
    customer: "Dina Lorenza",
    menu: "Paket Roti Manis",
    rating: 3,
    comment:
      "Rasa oke, tapi beberapa varian sudah agak kering. Semoga bisa diberi info kondisi produk.",
    date: "13 Mei 2026, 21:05",
    status: "new",
    orderId: "SFM-55E8V",
  },
] as const;

const filters = ["Semua", "Belum Dibalas", "Sudah Dibalas"] as const;

const ratingDistribution = [
  { label: "5", value: 68 },
  { label: "4", value: 22 },
  { label: "3", value: 8 },
  { label: "2", value: 2 },
  { label: "1", value: 0 },
] as const;

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={15}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200"
          }
        />
      ))}
    </div>
  );
}

export default function OwnerReviewsPage() {
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("Semua");
  const [selectedReview, setSelectedReview] = useState<OwnerReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [localReviews, setLocalReviews] = useState<OwnerReview[]>(reviews);

  const filteredReviews = useMemo(() => {
    if (activeFilter === "Belum Dibalas") {
      return localReviews.filter((review) => review.status === "new");
    }

    if (activeFilter === "Sudah Dibalas") {
      return localReviews.filter((review) => review.status === "replied");
    }

    return localReviews;
  }, [activeFilter, localReviews]);

  const averageRating =
    localReviews.reduce((total, review) => total + review.rating, 0) /
    localReviews.length;
  const newReviewCount = localReviews.filter((review) => review.status === "new").length;

  const openReplyModal = (review: OwnerReview) => {
    setSelectedReview(review);
    setReplyText(review.reply ?? "");
  };

  const closeReplyModal = () => {
    setSelectedReview(null);
    setReplyText("");
  };

  const submitReply = () => {
    if (!selectedReview || !replyText.trim()) {
      return;
    }

    setLocalReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === selectedReview.id
          ? {
              ...review,
              status: "replied",
              reply: replyText.trim(),
            }
          : review,
      ),
    );
    closeReplyModal();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-gray-900">
      <header className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            Review Customer
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
            Ulasan & Rating
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
            Pantau feedback pelanggan, balas ulasan penting, dan gunakan masukan
            untuk meningkatkan kualitas pickup dan kondisi produk.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">Rating</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-950">
                {averageRating.toFixed(1)}
              </p>
            </div>
            <div className="rounded-[24px] bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">Ulasan</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-950">
                {localReviews.length}
              </p>
            </div>
            <div className="rounded-[24px] bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-700">Baru</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-950">
                {newReviewCount}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-100 bg-gray-900 p-6 text-white shadow-xl">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Distribusi Rating</h2>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Performa 30 hari terakhir.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-amber-300">
              <Star size={24} className="fill-amber-300" />
            </div>
          </div>

          <div className="space-y-3">
            {ratingDistribution.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-6 text-xs font-extrabold text-gray-400">
                  {item.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-bold text-gray-300">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] bg-white/10 p-4">
            <div className="flex gap-3">
              <TrendingUp size={20} className="mt-0.5 text-emerald-300" />
              <p className="text-xs leading-5 font-semibold text-gray-300">
                Rating naik 0.3 poin setelah waktu pickup dibuat lebih jelas di
                kartu menu.
              </p>
            </div>
          </div>
        </section>
      </header>

      <section className="rounded-[32px] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-950">
              Daftar Ulasan
            </h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Prioritaskan ulasan baru dan ulasan dengan rating rendah.
            </p>
          </div>

          <div className="flex w-full rounded-2xl border border-gray-100 bg-gray-50 p-1 lg:w-fit">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all lg:flex-none ${
                    isActive
                      ? "bg-gray-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[28px] border border-gray-100 bg-gray-50/70 p-5 transition-colors hover:border-emerald-100 hover:bg-emerald-50/40"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm">
                    <UserRound size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-gray-950">
                        {review.customer}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-gray-400 shadow-sm">
                        {review.orderId}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500">
                      {review.menu}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <RatingStars rating={review.rating} />
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                        <Clock3 size={13} />
                        {review.date}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                    review.status === "new"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {review.status === "new" ? (
                    <AlertCircle size={13} />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  {review.status === "new" ? "Belum Dibalas" : "Dibalas"}
                </span>
              </div>

              <p className="mt-4 rounded-[22px] bg-white p-4 text-sm leading-6 font-medium text-gray-600 shadow-sm">
                {review.comment}
              </p>

              {review.reply ? (
                <div className="mt-3 rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                  <p className="mb-1 flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                    <MessageSquareText size={14} />
                    Balasan Toko
                  </p>
                  <p className="text-sm leading-6 font-medium text-emerald-900">
                    {review.reply}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-500 shadow-sm">
                  <ThumbsUp size={14} className="text-emerald-500" />
                  {review.rating >= 4 ? "Feedback positif" : "Perlu perhatian"}
                </div>
                <button
                  type="button"
                  onClick={() => openReplyModal(review)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500"
                >
                  <MessageSquareText size={17} />
                  {review.status === "new" ? "Balas Ulasan" : "Edit Balasan"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-emerald-50/50 p-6">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  Reply Review
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                  Balas {selectedReview.customer}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeReplyModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Tutup modal balas ulasan"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                <RatingStars rating={selectedReview.rating} />
                <p className="mt-3 text-sm leading-6 font-medium text-gray-600">
                  {selectedReview.comment}
                </p>
              </div>

              <label
                htmlFor="review-reply"
                className="mb-2 block text-sm font-extrabold text-gray-900"
              >
                Balasan Toko
              </label>
              <textarea
                id="review-reply"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Tulis balasan yang sopan dan membantu..."
                rows={5}
                className="w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-6">
              <button
                type="button"
                onClick={closeReplyModal}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={17} />
                Kirim Balasan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
