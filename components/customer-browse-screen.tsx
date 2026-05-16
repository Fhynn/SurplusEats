"use client";

import Image from "next/image";
import {
  Bell,
  ChevronDown,
  Filter,
  Flame,
  Leaf,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { CATEGORIES, formatRp, type Food } from "@/lib/customer-data";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";

const filterChips = [
  "Terdekat",
  "Harga Termurah",
  "Rating Tertinggi",
  "Stok Banyak",
] as const;

type FilterChip = (typeof filterChips)[number];

export function CustomerBrowseScreen() {
  const router = useRouter();
  const { addToCart } = useCustomerApp();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("Terdekat");
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadFoods() {
      setIsLoadingFoods(true);

      try {
        const params = new URLSearchParams();

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(`/api/menu-items?${params.toString()}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok: boolean;
          menuItems?: ApiMenuItem[];
        };

        if (!ignore) {
          setAllFoods(result.menuItems?.map(menuItemToFood) ?? []);
        }
      } catch {
        if (!ignore) {
          setAllFoods([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingFoods(false);
        }
      }
    }

    const timeoutId = window.setTimeout(loadFoods, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const foods = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let nextFoods = [...allFoods];

    if (activeCategory !== "Semua") {
      nextFoods = nextFoods.filter((food) => food.category === activeCategory);
    }

    if (normalizedQuery) {
      nextFoods = nextFoods.filter((food) =>
        [food.name, food.restaurant, food.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (activeFilter === "Harga Termurah") {
      return nextFoods.sort((firstFood, secondFood) => firstFood.price - secondFood.price);
    }

    if (activeFilter === "Rating Tertinggi") {
      return nextFoods.sort(
        (firstFood, secondFood) => secondFood.rating - firstFood.rating,
      );
    }

    if (activeFilter === "Stok Banyak") {
      return nextFoods.sort(
        (firstFood, secondFood) => secondFood.stock - firstFood.stock,
      );
    }

    return nextFoods;
  }, [activeCategory, activeFilter, allFoods, query]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <header className="sticky top-0 z-20 rounded-b-3xl bg-white px-6 pt-8 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-gray-400">
              Lokasi Saat Ini
              <ChevronDown size={14} className="text-emerald-500" />
            </span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <MapPin size={16} className="text-emerald-500" />
              Pilih lokasi
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              aria-label="Buka notifikasi"
            >
              <Bell size={19} />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600">
              <UserRound size={20} />
            </div>
          </div>
        </div>

        <div className="relative flex items-center rounded-2xl border border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]">
          <Search size={20} className="absolute left-4 text-emerald-500" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari makan malam hemat..."
            aria-label="Cari makanan surplus"
            className="w-full rounded-2xl bg-transparent py-3.5 pr-24 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-14 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              aria-label="Hapus pencarian"
            >
              <X size={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-emerald-500"
            aria-label="Buka filter pencarian"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="group relative mb-8 flex items-center justify-between overflow-hidden rounded-3xl bg-emerald-500 p-5 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl transition-transform duration-700 group-hover:scale-150" />

          <div className="relative z-10">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <Leaf size={18} className="fill-white" />
              Hasil Rescue
            </h2>
            <p className="text-xs leading-relaxed font-medium text-emerald-50/90">
              Ada{" "}
              <span className="rounded-md bg-emerald-600/50 px-1.5 py-0.5 text-sm font-bold text-white">
                {foods.length}
              </span>{" "}
              makanan surplus yang cocok.
            </p>
          </div>

          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
            <Flame size={24} className="fill-amber-300 text-amber-300" />
          </div>
        </section>

        <section className="-mx-6 flex space-x-3 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                activeCategory === category
                  ? "bg-gray-900 text-white shadow-[0_4px_18px_rgba(17,24,39,0.18)]"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {category}
            </button>
          ))}
        </section>

        <section className="mt-4 mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
              Flash Rescue
            </h2>
            <p className="text-xs font-medium text-gray-500">
              {query ? `Hasil untuk "${query}"` : `Urut: ${activeFilter}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"
          >
            <Filter size={14} />
            Filter
          </button>
        </section>

        {isLoadingFoods ? (
          <section className="rounded-[28px] border border-gray-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-950">
              Memuat menu database...
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Sistem mengambil menu aktif dari restoran yang sudah approved.
            </p>
          </section>
        ) : foods.length > 0 ? (
          <section className="space-y-4">
            {foods.map((food) => (
              <article
                key={food.id}
                onClick={() => router.push(`/detail/${food.id}`)}
                className="group flex gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all hover:border-emerald-100 hover:shadow-md"
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[18px]">
                  <Image
                    src={food.image}
                    alt={food.name}
                    fill
                    sizes="112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 rounded-lg border border-white/20 bg-amber-500/90 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                    Sisa {food.stock}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-2">
                  <h3 className="mb-1 line-clamp-2 text-sm leading-snug font-bold text-gray-900">
                    {food.name}
                  </h3>
                  <p className="mb-2 truncate text-[11px] font-medium text-gray-500">
                    {food.restaurant}
                  </p>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500">
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
                      <p className="mb-0.5 text-[10px] font-medium text-gray-400 line-through decoration-gray-300">
                        {formatRp(food.originalPrice)}
                      </p>
                      <p className="text-sm font-extrabold tracking-tight text-emerald-600">
                        {formatRp(food.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(food);
                      }}
                      className="rounded-xl bg-gray-100 p-2 text-gray-600 transition-colors duration-300 hover:bg-emerald-500 hover:text-white active:scale-95"
                      aria-label={`Tambah ${food.name} ke keranjang`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[28px] border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gray-50 text-gray-400">
              <Search size={36} />
            </div>
            <h2 className="text-lg font-extrabold text-gray-950">
              Tidak ada hasil
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Coba ubah kata kunci, kategori, atau filter pencarian.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("Semua");
                setActiveFilter("Terdekat");
              }}
              className="mt-6 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-extrabold text-white"
            >
              Reset Pencarian
            </button>
          </section>
        )}
      </main>

      {isFilterOpen ? (
        <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm">
          <div className="w-full rounded-t-[36px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-950">
                  Filter Pencarian
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Pilih urutan hasil makanan surplus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                aria-label="Tutup filter"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              {filterChips.map((filter) => {
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter);
                      setIsFilterOpen(false);
                    }}
                    className={`rounded-2xl border p-4 text-left text-sm font-extrabold transition-all ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                        : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
