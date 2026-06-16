"use client";

import Image from "next/image";
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  Clock3,
  ImageIcon,
  MessageSquare,
  Navigation,
  PackageCheck,
  QrCode,
  RefreshCcw,
  Search,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { InlineNotice, StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import {
  apiOrderToCard,
  type ApiOrder,
  type CustomerOrderCard,
  type UiOrderStatus,
} from "@/lib/order-mapper";
import { showSweetError, showSweetToast } from "@/lib/sweet-alert";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const statusClassNameByStatus: Record<UiOrderStatus, string> = {
  ready: "bg-emerald-50 text-emerald-600",
  preparing: "bg-blue-50 text-blue-600",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
  noShow: "bg-amber-50 text-amber-700",
};

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { customerLocation } = useCustomerApp();
  const [activeTab, setActiveTab] = useState<"aktif" | "selesai">("aktif");
  const [query, setQuery] = useState("");
  const [reviewOrder, setReviewOrder] = useState<CustomerOrderCard | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewPreviewUrls, setReviewPreviewUrls] = useState<string[]>([]);
  const [apiOrders, setApiOrders] = useState<ApiOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const allOrders = useMemo(
    () =>
      apiOrders.map((order) =>
        apiOrderToCard(order, customerLocation.coordinates),
      ),
    [apiOrders, customerLocation.coordinates],
  );
  const activeOrders = useMemo(
    () =>
      allOrders.filter(
        (order) => order.status === "ready" || order.status === "preparing",
      ),
    [allOrders],
  );
  const pastOrders = useMemo(
    () =>
      allOrders.filter(
        (order) =>
          order.status === "completed" ||
          order.status === "cancelled" ||
          order.status === "noShow",
      ),
    [allOrders],
  );
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

  const loadOrders = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingOrders(true);
      }

      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const result = (await response.json()) as {
          ok: boolean;
          message?: string;
          orders?: ApiOrder[];
        };

        if (!response.ok || !result.ok) {
          throw new Error(result.message || "Pesanan gagal dimuat.");
        }

        setApiOrders(result.orders ?? []);
        setNotice(null);
      } catch {
        if (!silent) {
          setApiOrders([]);
          setNotice({
            type: "error",
            message: "Pesanan gagal dimuat.",
          });
        }
      } finally {
        if (!silent) {
          setIsLoadingOrders(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useRealtimePolling({
    intervalMs: 10000,
    onPoll: () => loadOrders({ silent: true }),
  });

  const handleOpenOrder = (order: CustomerOrderCard) => {
    if (order.status === "ready" || order.status === "preparing") {
      router.push(`/orders/${order.id}`);
    }
  };

  const handleCloseReview = () => {
    reviewPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setReviewOrder(null);
    setRating(0);
    setReviewComment("");
    setReviewFiles([]);
    setReviewPreviewUrls([]);
  };

  const handleOpenReview = (order: CustomerOrderCard) => {
    reviewPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setReviewOrder(order);
    setRating(order.reviewRating ?? 0);
    setReviewComment(order.reviewComment ?? "");
    setReviewFiles([]);
    setReviewPreviewUrls([]);
  };

  const handleReviewFileChange = (files: FileList | null) => {
    reviewPreviewUrls.forEach((url) => URL.revokeObjectURL(url));

    const nextFiles = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4);

    setReviewFiles(nextFiles);
    setReviewPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const clearReviewFiles = () => {
    reviewPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setReviewFiles([]);
    setReviewPreviewUrls([]);
  };

  const uploadReviewImages = async () => {
    const assetIds: string[] = [];

    for (const file of reviewFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "review-images");
      formData.append("entityType", "review");

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        asset?: {
          id: string;
        };
      };

      if (!response.ok || !data.ok || !data.asset) {
        throw new Error(data.message || "Foto ulasan gagal diupload.");
      }

      assetIds.push(data.asset.id);
    }

    return assetIds;
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || rating <= 0 || isSubmittingReview) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      const assetIds = reviewFiles.length > 0 ? await uploadReviewImages() : undefined;
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: reviewOrder.id,
          rating,
          comment: reviewComment.trim() || undefined,
          assetIds,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        review?: {
          rating: number;
          comment: string | null;
          images?: Array<{
            asset: {
              id: string;
              url: string;
            };
          }>;
        };
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Ulasan gagal disimpan.");
      }

      setApiOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.orderCode === reviewOrder.id
            ? {
                ...order,
                review: {
                  rating: data.review?.rating ?? rating,
                  comment: data.review?.comment ?? (reviewComment.trim() || null),
                  images: data.review?.images ?? order.review?.images ?? [],
                },
              }
            : order,
        ),
      );
      setNotice({
        type: "success",
        message: "Ulasan berhasil disimpan.",
      });
      showSweetToast({
        icon: "success",
        title: "Ulasan berhasil disimpan.",
      });
      handleCloseReview();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ulasan gagal disimpan.";

      setNotice({
        type: "error",
        message,
      });
      void showSweetError({
        title: "Ulasan gagal",
        text: message,
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-4 shadow-sm md:px-8 md:pt-6 lg:px-10">
          <div className="mx-auto mb-5 flex w-full max-w-6xl items-start justify-between gap-4">
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

          <div className="mx-auto flex w-full max-w-6xl gap-4 border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setActiveTab("aktif");
                setQuery("");
              }}
              className={`relative flex min-h-11 items-center pb-3 text-sm font-bold transition-all ${
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
              className={`relative flex min-h-11 items-center pb-3 text-sm font-bold transition-all ${
                activeTab === "selesai" ? "text-gray-900" : "text-gray-400"
              }`}
            >
              Selesai ({pastOrders.length})
              {activeTab === "selesai" ? (
                <span className="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-gray-900" />
              ) : null}
            </button>
          </div>

          <div className="relative mx-auto mt-4 w-full max-w-6xl">
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

        <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 space-y-4 overflow-y-auto px-6 py-6 pb-28 [scrollbar-width:none] md:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden">
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

          {isLoadingOrders ? (
            <StateCard
              title="Memuat pesanan"
              description="Riwayat akan muncul sesuai session akun yang sedang login."
              variant="loading"
            />
          ) : null}

          {notice ? (
            <InlineNotice
              variant={notice.type}
              description={notice.message}
              className="rounded-[24px]"
            />
          ) : null}

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
                        order.status === "cancelled" || order.status === "noShow"
                          ? "grayscale"
                          : ""
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
                    {order.status === "completed" && order.reviewRating ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                        <Star size={11} className="fill-amber-500 text-amber-500" />
                        Sudah diulas {order.reviewRating}/5
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
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <a
                          href={order.pickupRouteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold whitespace-nowrap text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <Navigation size={14} />
                          {order.pickupRouteLabel}
                        </a>
                        <span className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition-colors group-hover:bg-emerald-500">
                          <QrCode size={14} />
                          Ambil
                        </span>
                      </div>
                    ) : null}

                    {order.status === "preparing" ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <a
                          href={order.pickupRouteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold whitespace-nowrap text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <Navigation size={14} />
                          {order.pickupRouteLabel}
                        </a>
                        <span className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold whitespace-nowrap text-blue-600 transition-colors group-hover:bg-blue-100">
                          Lacak
                          <ChevronRight size={14} />
                        </span>
                      </div>
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

                  {order.status === "noShow" ? (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 font-bold text-amber-800">
                      Order melewati batas pickup dan tidak bisa diambil lagi.
                    </div>
                  ) : null}

                  {order.status === "completed" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenReview(order);
                        }}
                        className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-2 text-[11px] font-extrabold whitespace-nowrap text-emerald-600 transition-colors hover:bg-emerald-50"
                      >
                        <MessageSquare size={13} />
                        {order.reviewRating ? "Edit Ulasan" : "Ulas"}
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
                          router.push(
                            order.foodId ? `/detail/${order.foodId}` : "/browse",
                          );
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

          {!isLoadingOrders && visibleOrders.length === 0 ? (
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
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm md:items-center md:justify-center md:p-6">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] md:max-w-xl md:rounded-[32px] md:shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" />

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

              <div className="mb-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-gray-800">
                      Foto Ulasan
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Maksimal 4 foto, format gambar.
                    </p>
                  </div>
                  {reviewFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearReviewFiles}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-[11px] font-extrabold text-red-600"
                    >
                      <Trash2 size={13} />
                      Hapus
                    </button>
                  ) : null}
                </div>
                {reviewPreviewUrls.length > 0 ? (
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {reviewPreviewUrls.map((url) => (
                      <div
                        key={url}
                        className="relative aspect-square overflow-hidden rounded-xl bg-white"
                      >
                        <Image
                          src={url}
                          alt="Preview foto ulasan"
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : reviewOrder.reviewImages && reviewOrder.reviewImages.length > 0 ? (
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {reviewOrder.reviewImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-xl bg-white"
                      >
                        <Image
                          src={image.url}
                          alt="Foto ulasan tersimpan"
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-xs font-extrabold text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600">
                  <ImageIcon size={16} />
                  Pilih Foto
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleReviewFileChange(event.target.files)}
                    className="sr-only"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={rating <= 0 || isSubmittingReview}
                className="w-full rounded-2xl bg-emerald-500 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none"
              >
                {isSubmittingReview
                  ? "Menyimpan..."
                  : reviewOrder.reviewRating
                    ? "Perbarui Ulasan"
                    : "Kirim Ulasan"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
