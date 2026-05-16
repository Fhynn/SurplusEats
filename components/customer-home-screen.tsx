"use client";

import Image from "next/image";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Flame,
  Gift,
  Leaf,
  MapPin,
  Plus,
  Search,
  Star,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { CATEGORIES, formatRp, type Food } from "@/lib/customer-data";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";

const quickActions = [
  {
    label: "Voucher",
    route: "/profile/vouchers",
    icon: Gift,
    className: "border-blue-100 bg-blue-50 text-blue-700",
  },
  {
    label: "Pickup",
    route: "/orders",
    icon: Flame,
    className: "border-amber-100 bg-amber-50 text-amber-700",
  },
  {
    label: "Impact",
    route: "/profile",
    icon: Leaf,
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
] as const;

export function CustomerHomeScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const { addToCart } = useCustomerApp();

  useEffect(() => {
    let ignore = false;

    async function loadFoods() {
      setIsLoadingFoods(true);

      try {
        const [response, ordersResponse, vouchersResponse] = await Promise.all([
          fetch("/api/menu-items", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/vouchers", { cache: "no-store" }),
        ]);
        const result = (await response.json()) as {
          ok: boolean;
          menuItems?: ApiMenuItem[];
        };
        const ordersData = (await ordersResponse.json()) as {
          ok: boolean;
          orders?: unknown[];
        };
        const vouchersData = (await vouchersResponse.json()) as {
          ok: boolean;
          vouchers?: unknown[];
        };

        if (!ignore) {
          setAllFoods(result.menuItems?.map(menuItemToFood) ?? []);
          setOrderCount(ordersData.orders?.length ?? 0);
          setVoucherCount(vouchersData.vouchers?.length ?? 0);
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

    loadFoods();

    return () => {
      ignore = true;
    };
  }, []);

  const foods = useMemo(() => {
    if (activeCategory === "Semua") {
      return allFoods;
    }

    return allFoods.filter((food) => food.category === activeCategory);
  }, [activeCategory, allFoods]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600"
              aria-label="Buka profil"
            >
              <UserRound size={20} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/browser")}
          className="relative flex w-full items-center rounded-2xl border border-transparent bg-gray-100/80 text-left transition-all duration-300 hover:border-emerald-500 hover:bg-white hover:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
        >
          <Search size={20} className="absolute left-4 text-gray-400" />
          <span className="w-full rounded-2xl py-3.5 pr-4 pl-12 text-sm text-gray-400">
            Cari makan malam hemat...
          </span>
        </button>
      </header>

      <main className="mt-6 px-6">
        <section className="group relative mb-5 overflow-hidden rounded-3xl bg-emerald-500 p-5 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl transition-transform duration-700 group-hover:scale-150" />

          <div className="relative z-10 mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-tight">
                <Leaf size={18} className="fill-white" />
                Kamu Food Hero!
              </h2>
              <p className="text-xs leading-relaxed font-medium text-emerald-50/90">
                Bulan ini kamu sudah menyelamatkan makanan lezat.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <Flame size={24} className="fill-amber-300 text-amber-300" />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-600/45 p-3">
              <p className="text-[10px] font-bold text-emerald-50">Saved</p>
              <p className="mt-1 text-sm font-extrabold">{orderCount} order</p>
            </div>
            <div className="rounded-2xl bg-emerald-600/45 p-3">
              <p className="text-[10px] font-bold text-emerald-50">Voucher</p>
              <p className="mt-1 text-sm font-extrabold">{voucherCount}</p>
            </div>
            <div className="rounded-2xl bg-emerald-600/45 p-3">
              <p className="text-[10px] font-bold text-emerald-50">Menu</p>
              <p className="mt-1 text-sm font-extrabold">{allFoods.length}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const value =
                action.label === "Voucher"
                  ? `${voucherCount} aktif`
                  : action.label === "Pickup"
                    ? `${orderCount} order`
                    : `${orderCount} order`;

              return (
              <button
                key={action.label}
                type="button"
                onClick={() => router.push(action.route)}
                className={`rounded-[20px] border p-3 text-left transition-transform active:scale-[0.98] ${action.className}`}
              >
                <Icon size={18} className="mb-2" />
                <p className="text-[10px] font-extrabold uppercase">
                  {action.label}
                </p>
                <p className="mt-1 text-sm font-extrabold text-gray-950">
                  {value}
                </p>
              </button>
            );
          })}
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
              Makanan terdekat yang segera habis
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/browser")}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600"
          >
            Lihat Semua
            <ChevronRight size={14} />
          </button>
        </section>

        <section className="space-y-4">
          {isLoadingFoods ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center text-sm font-bold text-gray-500 shadow-sm">
              Memuat menu dari database...
            </div>
          ) : null}
          {foods.map((food) => {
            const discount = Math.round(
              ((food.originalPrice - food.price) / food.originalPrice) * 100,
            );

            return (
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
                  <div className="absolute right-2 bottom-2 rounded-lg bg-emerald-500 px-2 py-1 text-[9px] font-extrabold text-white">
                    -{discount}%
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
            );
          })}
          {!isLoadingFoods && foods.length === 0 ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
              <h3 className="text-base font-extrabold text-gray-950">
                Belum ada menu aktif
              </h3>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Menu akan tampil otomatis setelah owner menambahkan produk aktif
                di database.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
