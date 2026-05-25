"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Star, Store, UserRound } from "lucide-react";

type OwnerReview = {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  restaurant: {
    name: string;
  };
  order: {
    orderCode: string;
  };
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OwnerReviewsPage() {
  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReviews() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/owner/reviews", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          reviews?: OwnerReview[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Ulasan gagal dimuat.");
        }

        if (!ignore) {
          setReviews(data.reviews ?? []);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(error instanceof Error ? error.message : "Ulasan gagal dimuat.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();

    return () => {
      ignore = true;
    };
  }, []);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    return (
      reviews.reduce((total, review) => total + review.rating, 0) /
      reviews.length
    ).toFixed(1);
  }, [reviews]);

  const repliedCount = useMemo(
    () => reviews.filter((review) => review.ownerReply).length,
    [reviews],
  );

  const handleReplyReview = async (review: OwnerReview) => {
    const reply = (replyDrafts[review.id] ?? review.ownerReply ?? "").trim();

    if (reply.length < 3 || submittingReplyId) {
      return;
    }

    setSubmittingReplyId(review.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/owner/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        review?: OwnerReview;
      };

      if (!response.ok || !data.ok || !data.review) {
        throw new Error(data.message || "Balasan ulasan gagal disimpan.");
      }

      setReviews((currentReviews) =>
        currentReviews.map((currentReview) =>
          currentReview.id === data.review?.id ? data.review : currentReview,
        ),
      );
      setReplyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [review.id]: data.review?.ownerReply ?? "",
      }));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Balasan ulasan gagal disimpan.",
      );
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
          Owner Reviews
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          Ulasan Customer
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Semua ulasan diambil dari order yang sudah selesai dan direview.
        </p>
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <Star size={24} className="mb-4 fill-amber-400 text-amber-400" />
          <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
            Rating Rata-rata
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-950">
            {averageRating}
          </p>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <MessageSquareText size={24} className="mb-4 text-emerald-600" />
          <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
            Total Ulasan
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-950">
            {reviews.length}
          </p>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <MessageSquareText size={24} className="mb-4 text-blue-600" />
          <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
            Sudah Dibalas
          </p>
          <p className="mt-2 text-3xl font-extrabold text-gray-950">
            {repliedCount}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="py-10 text-center text-sm font-bold text-gray-500">
            Memuat ulasan...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Star size={26} />
            </div>
            <h2 className="text-lg font-extrabold text-gray-950">
              Belum ada ulasan
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Ulasan akan muncul setelah customer menyelesaikan order dan
              memberikan rating.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-gray-950">
                        {review.user.name}
                      </p>
                      <p className="truncate text-xs font-bold text-gray-400">
                        {review.order.orderCode} - {formatTime(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-600">
                    <Star size={13} className="fill-amber-500" />
                    {review.rating}
                  </div>
                </div>
                <p className="text-sm leading-6 font-medium text-gray-600">
                  {review.comment || "Customer tidak menulis komentar."}
                </p>
                {review.ownerReply ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-extrabold text-emerald-800">
                      Balasan toko
                    </p>
                    <p className="mt-2 text-sm leading-6 font-semibold text-emerald-900">
                      {review.ownerReply}
                    </p>
                    {review.ownerRepliedAt ? (
                      <p className="mt-2 text-[11px] font-bold text-emerald-600">
                        {formatTime(review.ownerRepliedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3">
                  <textarea
                    value={replyDrafts[review.id] ?? review.ownerReply ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [review.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={500}
                    placeholder="Balas ulasan customer dengan sopan dan jelas..."
                    className="w-full resize-none rounded-xl bg-gray-50 p-3 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-gray-400">
                      {(replyDrafts[review.id] ?? review.ownerReply ?? "").length}/500
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleReplyReview(review)}
                      disabled={
                        submittingReplyId === review.id ||
                        (replyDrafts[review.id] ?? review.ownerReply ?? "")
                          .trim().length < 3
                      }
                      className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {submittingReplyId === review.id
                        ? "Menyimpan..."
                        : review.ownerReply
                          ? "Update Balasan"
                          : "Balas Ulasan"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-gray-400">
                  <Store size={14} />
                  {review.restaurant.name}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
