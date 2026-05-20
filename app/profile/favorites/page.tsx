"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  Heart,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { CATEGORIES, formatRp, type Food } from "@/lib/customer-data";
import {
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
} from "@/lib/customer-location";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { applyFoodDistance, sortFoodsByDistance } from "@/lib/geo-distance";

type ApiFavorite = {
  id: string;
  menuItem: ApiMenuItem;
};

export default function CustomerFavoritesPage() {
  const router = useRouter();
  const { addToCart } = useCustomerApp();
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);

    try {
      const [favoritesResponse, addressesResponse] = await Promise.all([
        fetch("/api/favorites", { cache: "no-store" }),
        fetch("/api/addresses", { cache: "no-store" }),
      ]);
      const favoritesData = (await favoritesResponse.json()) as {
        ok: boolean;
        message?: string;
        favorites?: ApiFavorite[];
      };
      const addressesData = (await addressesResponse.json()) as {
        ok: boolean;
        addresses?: ApiCustomerAddress[];
      };

      if (!favoritesResponse.ok || !favoritesData.ok) {
        throw new Error(favoritesData.message || "Favorit gagal dimuat.");
      }

      const location = getCustomerLocationFromAddresses(
        addressesData.addresses ?? [],
      );
      const foods = (favoritesData.favorites ?? []).map((favorite) =>
        applyFoodDistance(
          menuItemToFood(favorite.menuItem),
          location.coordinates,
        ),
      );

      setFavorites(sortFoodsByDistance(foods));
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Favorit gagal dimuat.");
      setFavorites([]);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const visibleFavorites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let nextFavorites = [...favorites];

    if (activeCategory !== "Semua") {
      nextFavorites = nextFavorites.filter(
        (food) => food.category === activeCategory,
      );
    }

    if (normalizedQuery) {
      nextFavorites = nextFavorites.filter((food) =>
        [food.name, food.restaurant, food.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    return nextFavorites;
  }, [activeCategory, favorites, query]);

  const handleRemoveFavorite = async (foodId: string) => {
    const previousFavorites = favorites;
    setFavorites((currentFavorites) =>
      currentFavorites.filter((food) => food.id !== foodId),
    );

    try {
      const response = await fetch(`/api/favorites?menuItemId=${foodId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Favorit gagal dihapus.");
      }
    } catch (error) {
      setFavorites(previousFavorites);
      setNotice(
        error instanceof Error ? error.message : "Favorit gagal dihapus.",
      );
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-5 shadow-sm sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              <Link
                href="/profile"
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
                aria-label="Kembali ke profil"
              >
                <ChevronLeft size={24} className="text-gray-800" />
              </Link>
              <div className="ml-2 min-w-0">
                <h1 className="text-lg font-extrabold text-gray-900">
                  Favorit Saya
                </h1>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {favorites.length} menu tersimpan
                </p>
              </div>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Heart size={22} className="fill-red-500" />
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
              placeholder="Cari menu favorit..."
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-28 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8 [&::-webkit-scrollbar]:hidden">
          <section className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeCategory === category
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-white text-gray-500"
                }`}
              >
                {category}
              </button>
            ))}
          </section>

          {notice ? (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {notice}
            </div>
          ) : null}

          {isLoadingFavorites ? (
            <section className="rounded-[28px] border border-gray-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
              <h2 className="text-lg font-extrabold text-gray-950">
                Memuat favorit...
              </h2>
            </section>
          ) : visibleFavorites.length > 0 ? (
            <section className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {visibleFavorites.map((food) => (
                <article
                  key={food.id}
                  onClick={() => router.push(`/detail/${food.id}`)}
                  className="group flex cursor-pointer gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md"
                >
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[18px] bg-gray-100">
                    <Image
                      src={food.image}
                      alt={food.name}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-1 text-[9px] font-extrabold text-white">
                      Favorit
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                    <h2 className="line-clamp-2 text-sm leading-snug font-extrabold text-gray-950">
                      {food.name}
                    </h2>
                    <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
                      {food.restaurant}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                      <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        {food.rating}
                      </span>
                      <span className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5">
                        <MapPin size={10} />
                        {food.distance}
                      </span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 line-through">
                          {formatRp(food.originalPrice)}
                        </p>
                        <p className="text-sm font-extrabold text-emerald-600">
                          {formatRp(food.price)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveFavorite(food.id);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                          aria-label={`Hapus ${food.name} dari favorit`}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(food);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-emerald-500"
                          aria-label={`Tambah ${food.name} ke keranjang`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="rounded-[28px] border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gray-50 text-gray-400">
                <ShoppingBag size={32} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Belum ada favorit
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 font-medium text-gray-500">
                Simpan menu dari halaman detail produk untuk belanja ulang lebih cepat.
              </p>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white"
              >
                Cari Menu
              </button>
            </section>
          )}
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
