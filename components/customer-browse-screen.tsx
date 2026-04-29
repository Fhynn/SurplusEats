"use client";

import Image from "next/image";
import { Filter, MapPin, Plus, Search, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MOCK_FOODS, formatRp } from "@/lib/customer-data";

const FILTER_CHIPS = ["Terdekat", "Harga Termurah", "Rating Tertinggi"] as const;

export function CustomerBrowseScreen() {
  const router = useRouter();
  const { addToCart } = useCustomerApp();
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTER_CHIPS)[number]>("Terdekat");

  const foods = useMemo(() => {
    const sortedFoods = [...MOCK_FOODS];

    if (activeFilter === "Harga Termurah") {
      return sortedFoods.sort((firstFood, secondFood) => firstFood.price - secondFood.price);
    }

    if (activeFilter === "Rating Tertinggi") {
      return sortedFoods.sort(
        (firstFood, secondFood) => secondFood.rating - firstFood.rating,
      );
    }

    return sortedFoods;
  }, [activeFilter]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="sticky top-0 z-20 rounded-b-3xl bg-white px-6 pt-8 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="relative flex items-center rounded-2xl border border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]">
          <Search size={20} className="absolute left-4 text-emerald-500" />
          <input
            type="text"
            autoFocus
            defaultValue="makanan surplus"
            aria-label="Cari makanan surplus"
            className="w-full rounded-2xl bg-transparent py-3.5 pr-14 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-emerald-500"
            aria-label="Filter pencarian"
          >
            <Filter size={18} />
          </button>
        </div>

        <div className="-mx-6 mt-4 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_CHIPS.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.2)]"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-6">
        <p className="mb-4 text-xs font-extrabold tracking-wide text-gray-500">
          Ditemukan {foods.length} makanan surplus
        </p>

        <section className="space-y-4">
          {foods.map((food) => (
            <article
              key={food.id}
              onClick={() => router.push(`/detail/${food.id}`)}
              className="group flex gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
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
              <div className="flex flex-1 flex-col justify-center py-1 pr-2">
                <h3 className="mb-1 line-clamp-2 text-sm leading-snug font-bold text-gray-900">
                  {food.name}
                </h3>
                <p className="mb-2 text-[11px] font-medium text-gray-500">
                  {food.restaurant}
                </p>
                <div className="mb-3 flex items-center gap-2.5 text-[10px] font-bold text-gray-500">
                  <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    {food.rating}
                  </span>
                  <span className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5">
                    <MapPin size={10} />
                    {food.distance}
                  </span>
                </div>
                <div className="mt-auto flex items-end justify-between">
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
      </div>
    </div>
  );
}
