"use client";

import Image from "next/image";
import {
  ChevronLeft,
  Clock3,
  MapPin,
  Heart,
  Loader2,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import {
  CATEGORIES,
  formatRatingSummary,
  formatRatingValue,
  formatRp,
  type Food,
} from "@/lib/customer-data";
import {
  applyFoodDistance,
  getPickupRouteUrl,
  sortFoodsByDistance,
} from "@/lib/geo-distance";

export type CustomerStoreDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  phone: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  rating: number;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
  pickupStart: string | null;
  pickupEnd: string | null;
  favoriteCount: number;
  isFavorite: boolean;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    ownerReply: string | null;
    ownerRepliedAt: string | null;
    customerName: string;
    createdAt: string;
  }>;
  foods: Food[];
};

type StoreSort = "recommended" | "price" | "stock";

const sortOptions: Array<{ id: StoreSort; label: string }> = [
  { id: "recommended", label: "Rekomendasi" },
  { id: "price", label: "Termurah" },
  { id: "stock", label: "Stok" },
];

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function CustomerStoreScreen({
  store,
}: Readonly<{
  store: CustomerStoreDetail;
}>) {
  const router = useRouter();
  const { addToCart, customerLocation } = useCustomerApp();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [activeSort, setActiveSort] = useState<StoreSort>("recommended");
  const [isFavoriteStore, setIsFavoriteStore] = useState(store.isFavorite);
  const [favoriteCount, setFavoriteCount] = useState(store.favoriteCount);
  const [isTogglingFavoriteStore, setIsTogglingFavoriteStore] = useState(false);
  const [favoriteStoreNotice, setFavoriteStoreNotice] = useState<string | null>(
    null,
  );

  const storeCoordinates =
    store.latitude !== null && store.longitude !== null
      ? {
          latitude: store.latitude,
          longitude: store.longitude,
        }
      : null;
  const pickupRoute = getPickupRouteUrl(
    customerLocation.coordinates,
    storeCoordinates,
    `${store.name} ${store.city}`,
  );
  const bannerImage =
    store.bannerUrl || store.imageUrl || store.foods[0]?.image || "/placeholder-food.svg";
  const logoImage = store.imageUrl || store.foods[0]?.image || "/placeholder-food.svg";
  const pickupWindow = `${store.pickupStart || "18:00"} - ${
    store.pickupEnd || "21:00"
  }`;
  const foods = useMemo(
    () =>
      sortFoodsByDistance(
        store.foods.map((food) =>
          applyFoodDistance(food, customerLocation.coordinates),
        ),
      ),
    [customerLocation.coordinates, store.foods],
  );

  const visibleFoods = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let nextFoods = [...foods];

    if (activeCategory !== "Semua") {
      nextFoods = nextFoods.filter((food) => food.category === activeCategory);
    }

    if (normalizedQuery) {
      nextFoods = nextFoods.filter((food) =>
        [food.name, food.category, food.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (activeSort === "price") {
      return nextFoods.sort((firstFood, secondFood) => firstFood.price - secondFood.price);
    }

    if (activeSort === "stock") {
      return nextFoods.sort(
        (firstFood, secondFood) => secondFood.stock - firstFood.stock,
      );
    }

    return sortFoodsByDistance(nextFoods);
  }, [activeCategory, activeSort, foods, query]);

  const handleToggleFavoriteStore = async () => {
    if (isTogglingFavoriteStore) {
      return;
    }

    const nextIsFavorite = !isFavoriteStore;
    const previousIsFavorite = isFavoriteStore;
    const previousFavoriteCount = favoriteCount;

    setIsFavoriteStore(nextIsFavorite);
    setFavoriteCount((currentCount) =>
      Math.max(0, currentCount + (nextIsFavorite ? 1 : -1)),
    );
    setIsTogglingFavoriteStore(true);
    setFavoriteStoreNotice(null);

    try {
      const response = await fetch(
        nextIsFavorite
          ? "/api/favorite-restaurants"
          : `/api/favorite-restaurants?restaurantId=${encodeURIComponent(store.id)}`,
        {
          method: nextIsFavorite ? "POST" : "DELETE",
          headers: nextIsFavorite
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
          body: nextIsFavorite
            ? JSON.stringify({ restaurantId: store.id })
            : undefined,
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Status toko favorit gagal disimpan.");
      }
    } catch (error) {
      setIsFavoriteStore(previousIsFavorite);
      setFavoriteCount(previousFavoriteCount);
      setFavoriteStoreNotice(
        error instanceof Error
          ? error.message
          : "Status toko favorit gagal disimpan.",
      );
    } finally {
      setIsTogglingFavoriteStore(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="relative h-72 overflow-hidden bg-gray-900 md:h-80">
          <Image
            src={bannerImage}
            alt={store.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-gray-950/25" />

          <button
            type="button"
            onClick={() => router.back()}
            className="absolute top-8 left-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm backdrop-blur"
            aria-label="Kembali"
          >
            <ChevronLeft size={23} />
          </button>

          <button
            type="button"
            onClick={() => void handleToggleFavoriteStore()}
            disabled={isTogglingFavoriteStore}
            aria-pressed={isFavoriteStore}
            className={`absolute top-8 right-5 z-10 inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-extrabold shadow-sm backdrop-blur transition-colors disabled:cursor-wait ${
              isFavoriteStore
                ? "bg-red-500 text-white"
                : "bg-white/90 text-gray-900 hover:bg-red-50 hover:text-red-500"
            }`}
          >
            {isTogglingFavoriteStore ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Heart
                size={16}
                className={isFavoriteStore ? "fill-white" : ""}
              />
            )}
            {isFavoriteStore ? "Diikuti" : "Ikuti"}
          </button>

          <div className="absolute right-5 bottom-7 left-5 flex items-end gap-4 md:right-8 md:left-8">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-xl">
              <Image
                src={logoImage}
                alt={store.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 text-white">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-emerald-100">
                <Store size={14} />
                Official Partner
              </p>
              <h1 className="truncate text-3xl font-extrabold tracking-tight">
                {store.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/90">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                  <Star size={12} className="fill-amber-300 text-amber-300" />
                  {formatRatingSummary(store.rating, store.reviewCount)}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                  {store.foods.length} menu
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                  {favoriteCount} pengikut
                </span>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8">
          {favoriteStoreNotice ? (
            <section className="mb-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {favoriteStoreNotice}
            </section>
          ) : null}

          <section className="mb-5 grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <MapPin size={19} className="mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <h2 className="text-sm font-extrabold text-gray-950">
                    {store.address}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {store.city}
                  </p>
                </div>
              </div>
              <a
                href={pickupRoute.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 sm:w-auto"
              >
                <Navigation size={17} />
                {pickupRoute.label}
              </a>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 size={18} className="text-amber-500" />
                <h2 className="text-sm font-extrabold text-gray-950">
                  Pickup
                </h2>
              </div>
              <p className="text-2xl font-extrabold text-gray-950">
                {pickupWindow}
              </p>
              <p className="mt-2 text-xs leading-5 font-semibold text-gray-500">
                {store.phone || "Nomor toko belum tersedia"}
              </p>
            </div>
          </section>

          {store.description ? (
            <section className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm leading-7 font-medium text-gray-600">
                {store.description}
              </p>
            </section>
          ) : null}

          <section className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-950">
                  Ulasan Pembeli
                </h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Rating toko diperbarui dari order selesai.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">
                <Star size={13} className="fill-amber-500 text-amber-500" />
                {store.reviewCount > 0
                  ? `${formatRatingValue(store.rating, store.reviewCount)}/5`
                  : "Belum ada"}
              </span>
            </div>

            {store.reviews.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {store.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {review.customerName}
                        </h3>
                        <p className="mt-0.5 text-[11px] font-semibold text-gray-400">
                          {formatReviewDate(review.createdAt)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-extrabold text-amber-700">
                        <Star size={11} className="fill-amber-500 text-amber-500" />
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="line-clamp-3 text-xs leading-5 font-medium text-gray-600">
                      {review.comment || "Customer memberi rating tanpa komentar."}
                    </p>
                    {review.ownerReply ? (
                      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3">
                        <p className="text-[11px] font-extrabold text-emerald-700">
                          Balasan toko
                        </p>
                        <p className="mt-1 text-xs leading-5 font-semibold text-emerald-950">
                          {review.ownerReply}
                        </p>
                        {review.ownerRepliedAt ? (
                          <p className="mt-2 text-[10px] font-bold text-emerald-600">
                            {formatReviewDate(review.ownerRepliedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                <p className="text-sm font-extrabold text-gray-950">
                  Belum ada ulasan
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Ulasan akan muncul setelah customer menyelesaikan pickup.
                </p>
              </div>
            )}
          </section>

          <section className="sticky top-0 z-20 -mx-5 mb-5 border-y border-gray-100 bg-gray-50/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari menu di toko ini..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white pr-4 pl-11 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold transition-colors ${
                      activeCategory === category
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveSort(option.id)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-extrabold transition-colors ${
                      activeSort === option.id
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "bg-white text-gray-500 ring-1 ring-gray-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {visibleFoods.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleFoods.map((food) => {
                const discount = Math.round(
                  ((food.originalPrice - food.price) / food.originalPrice) * 100,
                );
                const detailRoute = `/detail/${food.id}`;

                return (
                  <article
                    key={food.id}
                    onClick={() => router.push(detailRoute)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(detailRoute);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm transition-all hover:border-emerald-100 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <Image
                        src={food.image}
                        alt={food.name}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 rounded-xl bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold text-white">
                        Sisa {food.stock}
                      </div>
                      <div className="absolute right-3 bottom-3 rounded-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white">
                        -{discount}%
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-extrabold text-gray-950">
                        {food.name}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                          {food.time}
                        </span>
                        <span className="rounded-lg bg-gray-50 px-2 py-1">
                          {food.distance}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 line-through">
                            {formatRp(food.originalPrice)}
                          </p>
                          <p className="text-lg font-extrabold text-emerald-600">
                            {formatRp(food.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(food);
                          }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white transition-colors hover:bg-emerald-500"
                          aria-label={`Tambah ${food.name} ke keranjang`}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-400">
                <ShoppingBag size={30} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Menu tidak ditemukan
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Coba ubah pencarian atau kategori.
              </p>
            </section>
          )}
        </main>
      </div>

      <a
        href={`/support?store=${store.slug}`}
        className="absolute right-5 bottom-24 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.25)] transition-colors hover:bg-emerald-500 md:bottom-6"
        aria-label="Hubungi toko"
      >
        <MessageCircle size={22} />
      </a>
    </div>
  );
}
