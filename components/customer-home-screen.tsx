"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Bot,
  ChevronRight,
  Flame,
  Gift,
  Home,
  Leaf,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Star,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { CustomerLocationControl } from "@/components/customer-location-control";
import {
  CATEGORIES,
  formatRatingValue,
  formatRp,
  type Food,
} from "@/lib/customer-data";
import type { CustomerLocation } from "@/lib/customer-location";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import {
  applyFoodDistance,
  hasFoodPickupCoordinates,
  isFoodWithinPickupRadius,
  NEARBY_PICKUP_RADIUS_KM,
  sortFoodsByDistance,
} from "@/lib/geo-distance";

const bannerImages = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070&auto=format&fit=crop",
] as const;

const navItems = [
  { label: "Beranda", href: "/home", icon: Home },
  { label: "ResQBot", href: "/ai", icon: Bot },
  { label: "Keranjang", href: "/cart", icon: ShoppingBag },
  { label: "Akun", href: "/profile", icon: User },
] as const;

function getFoodDiscount(food: Food) {
  if (food.originalPrice <= 0 || food.originalPrice <= food.price) {
    return 0;
  }

  return Math.round(((food.originalPrice - food.price) / food.originalPrice) * 100);
}

export function CustomerHomeScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const {
    addToCart,
    cartCount,
    customerLocation,
    isCustomerLocationLoading,
    setCustomerLocation,
    unreadNotificationCount,
  } = useCustomerApp();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentBannerIndex((currentIndex) =>
        currentIndex + 1 >= bannerImages.length ? 0 : currentIndex + 1,
      );
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadFoods() {
      setIsLoadingFoods(true);

      try {
        const [meResponse, response, ordersResponse, vouchersResponse] =
          await Promise.all([
            fetch("/api/auth/me", { cache: "no-store" }),
            fetch("/api/menu-items", { cache: "no-store" }),
            fetch("/api/orders", { cache: "no-store" }),
            fetch("/api/vouchers", { cache: "no-store" }),
          ]);
        const meData = (await meResponse.json()) as {
          ok: boolean;
          user?: unknown;
        };
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
          vouchers?: Array<{ status?: string }>;
        };

        if (!meResponse.ok || !meData.ok || !meData.user) {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/");
          router.refresh();
          return;
        }

        if (!ignore) {
          const nextFoods = (result.menuItems?.map(menuItemToFood) ?? []).map(
            (food) => applyFoodDistance(food, customerLocation.coordinates),
          );

          setAllFoods(sortFoodsByDistance(nextFoods));
          setOrderCount(ordersData.orders?.length ?? 0);
          setVoucherCount(
            vouchersData.vouchers?.filter(
              (voucher) => voucher.status === "available",
            ).length ?? 0,
          );
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

    void loadFoods();

    return () => {
      ignore = true;
    };
  }, [customerLocation.coordinates, router]);

  const foods = useMemo(() => {
    if (activeCategory === "Semua") {
      return sortFoodsByDistance(allFoods);
    }

    return sortFoodsByDistance(
      allFoods.filter((food) => food.category === activeCategory),
    );
  }, [activeCategory, allFoods]);

  const nearbyFoodCount = foods.filter((food) =>
    isFoodWithinPickupRadius(food),
  ).length;
  const foodWithoutPickupPinCount = foods.filter(
    (food) => !hasFoodPickupCoordinates(food),
  ).length;

  const handleLocationChange = (nextLocation: CustomerLocation) => {
    setCustomerLocation(nextLocation);
    setAllFoods((currentFoods) =>
      sortFoodsByDistance(
        currentFoods.map((food) =>
          applyFoodDistance(food, nextLocation.coordinates),
        ),
      ),
    );
  };

  const statsCards = [
    {
      label: "Voucher",
      value: voucherCount,
      suffix: "aktif",
      route: "/profile/vouchers",
      icon: Gift,
      iconClassName: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pickup",
      value: orderCount,
      suffix: "order",
      route: "/orders",
      icon: Flame,
      iconClassName: "bg-amber-50 text-amber-500",
    },
    {
      label: "Impact",
      value: orderCount,
      suffix: "order",
      route: "/profile",
      icon: Leaf,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
  ] as const;

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
            <Leaf size={24} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            ResQFood
          </span>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/home";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={20} />
                {item.label}
                {item.href === "/cart" && cartCount > 0 ? (
                  <span className="ml-auto rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:ml-64 lg:pb-12">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex items-center justify-between lg:w-auto">
              <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                <CustomerLocationControl
                  location={customerLocation}
                  isLoading={isCustomerLocationLoading}
                  onLocationChange={handleLocationChange}
                />
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => router.push("/notifications")}
                  className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Buka notifikasi"
                >
                  <Bell size={18} />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-emerald-600"
                  aria-label="Buka akun"
                >
                  <User size={15} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/browser")}
              className="relative flex w-full max-w-2xl items-center rounded-full border border-gray-200 bg-gray-50/80 py-2.5 pr-4 pl-10 text-left text-xs text-gray-400 outline-none transition-all hover:border-emerald-500 hover:bg-white hover:ring-2 hover:ring-emerald-500/20 lg:py-3 lg:pl-11 lg:text-sm"
            >
              <Search
                size={16}
                className="absolute left-3.5 text-gray-400 lg:left-4"
              />
              Cari makan malam hemat...
            </button>

            <div className="hidden items-center gap-4 lg:flex">
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
                aria-label="Buka notifikasi"
              >
                <Bell size={22} />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-50 bg-emerald-100 text-emerald-600"
                aria-label="Buka akun"
              >
                <User size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl space-y-5 p-4 lg:space-y-8 lg:p-8">
          <section className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-xl shadow-gray-200 lg:min-h-[220px] lg:rounded-3xl lg:p-8">
            {bannerImages.map((image, index) => (
              <Image
                key={image}
                src={image}
                alt={`Banner makanan ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) calc(100vw - 320px), 100vw"
                className={`object-cover transition-all duration-1000 ease-in-out ${
                  index === currentBannerIndex
                    ? "scale-105 opacity-100"
                    : "scale-100 opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-gray-900/10" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="max-w-[80%] sm:max-w-none">
                <h1 className="mb-1.5 flex items-center gap-2 text-lg font-extrabold tracking-tight text-white drop-shadow-md sm:text-2xl lg:mb-2 lg:gap-2.5 lg:text-3xl">
                  <span className="rounded-md border border-emerald-400 bg-emerald-500 p-1 shadow-sm lg:rounded-lg lg:p-1.5">
                    <Leaf
                      className="text-white lg:h-5 lg:w-5"
                      fill="currentColor"
                      size={16}
                    />
                  </span>
                  Kamu Food Hero!
                </h1>
                <p className="text-[11px] leading-relaxed font-medium text-gray-200 drop-shadow sm:text-sm lg:text-base">
                  Bulan ini kamu sudah menyelamatkan makanan lezat.
                </p>

                <div className="mt-3 flex gap-1.5 lg:mt-4">
                  {bannerImages.map((image, index) => (
                    <button
                      key={image}
                      type="button"
                      onClick={() => setCurrentBannerIndex(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentBannerIndex
                          ? "w-5 bg-emerald-400"
                          : "w-1.5 bg-white/50 hover:bg-white/90"
                      }`}
                      aria-label={`Tampilkan banner ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="hidden items-center justify-center rounded-xl border border-white/10 bg-white/10 p-2 shadow-inner backdrop-blur-md transition-transform hover:scale-105 sm:flex lg:rounded-2xl lg:p-3">
                <Flame
                  size={24}
                  className="fill-amber-400 text-amber-400 lg:h-7 lg:w-7"
                />
              </div>
            </div>

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 sm:gap-4 lg:mt-8">
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/10 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20 sm:rounded-2xl lg:p-4">
                <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-gray-300 uppercase lg:mb-1 lg:text-xs">
                  Saved
                </p>
                <p className="text-base leading-none font-extrabold text-white sm:text-xl lg:text-2xl">
                  {orderCount}{" "}
                  <span className="text-[9px] font-medium normal-case opacity-70 sm:text-xs">
                    order
                  </span>
                </p>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/10 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20 sm:rounded-2xl lg:p-4">
                <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-gray-300 uppercase lg:mb-1 lg:text-xs">
                  Voucher
                </p>
                <p className="text-base leading-none font-extrabold text-white sm:text-xl lg:text-2xl">
                  {voucherCount}
                </p>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/10 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20 sm:rounded-2xl lg:p-4">
                <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-gray-300 uppercase lg:mb-1 lg:text-xs">
                  Menu
                </p>
                <p className="text-base leading-none font-extrabold text-white sm:text-xl lg:text-2xl">
                  {allFoods.length}
                </p>
              </div>
            </div>
          </section>

          <section className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {statsCards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => router.push(card.route)}
                  className="min-w-[120px] flex-1 snap-start rounded-xl border border-gray-200/60 bg-white p-3 text-left shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-[0.98] lg:min-w-0 lg:rounded-2xl lg:p-4"
                >
                  <div className="mb-2 flex items-center gap-2 lg:mb-3">
                    <span className={`rounded-lg p-1.5 lg:p-2 ${card.iconClassName}`}>
                      <Icon size={14} className="lg:h-5 lg:w-5" />
                    </span>
                    <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase lg:text-xs">
                      {card.label}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg leading-none font-extrabold text-gray-900 lg:text-2xl">
                      {card.value}
                    </p>
                    <p className="text-[10px] font-medium text-gray-500 lg:text-xs">
                      {card.suffix}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] lg:mx-0 lg:gap-2.5 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold transition-all lg:px-5 lg:py-2.5 lg:text-sm ${
                  activeCategory === category
                    ? "bg-gray-900 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {category}
              </button>
            ))}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between lg:mb-5">
              <div>
                <h2 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 lg:gap-2 lg:text-xl">
                  Flash Rescue
                  <Flame
                    size={18}
                    className="fill-orange-500 text-orange-500 lg:h-5 lg:w-5"
                  />
                </h2>
                <p className="mt-0.5 text-[10px] text-gray-500 lg:mt-1 lg:text-xs">
                  {customerLocation.coordinates
                    ? `${nearbyFoodCount} menu dalam ${NEARBY_PICKUP_RADIUS_KM} km, hasil lain tetap tampil`
                    : "Aktifkan lokasi agar menu diurutkan dari titik pickup terdekat"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/browser")}
                className="flex items-center text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700 lg:text-sm"
              >
                Lihat Semua
                <ChevronRight size={14} className="lg:h-4 lg:w-4" />
              </button>
            </div>

            {!customerLocation.coordinates || foodWithoutPickupPinCount > 0 ? (
              <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 font-semibold text-emerald-800">
                {!customerLocation.coordinates
                  ? "Aktifkan lokasi otomatis di atas untuk melihat jarak pickup dari posisimu."
                  : `${foodWithoutPickupPinCount} menu belum punya pin toko, jadi jaraknya belum bisa dihitung.`}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {isLoadingFoods ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm font-bold text-gray-500 shadow-sm">
                  Memuat menu...
                </div>
              ) : null}

              {foods.map((food) => {
                const discount = getFoodDiscount(food);
                const detailRoute = `/detail/${food.id}`;
                const hasDistance = food.distanceKm !== null && food.distanceKm !== undefined;

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
                    className="group flex cursor-pointer gap-3 rounded-xl border border-gray-100 bg-white p-2 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-emerald-100 hover:shadow-md focus:ring-4 focus:ring-emerald-100 focus:outline-none lg:gap-4 lg:rounded-2xl"
                  >
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg lg:h-32 lg:w-32 lg:rounded-xl">
                      <Image
                        src={food.image}
                        alt={food.name}
                        fill
                        sizes="(min-width: 1024px) 128px, 96px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 rounded-lg ring-1 ring-black/10 ring-inset lg:rounded-xl" />
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] leading-tight font-bold text-amber-950 shadow-sm lg:rounded-lg lg:px-2 lg:py-1 lg:text-[10px]">
                        Sisa {food.stock}
                      </span>
                      {discount > 0 ? (
                        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[9px] leading-tight font-bold text-white shadow-sm backdrop-blur-sm lg:rounded-lg lg:px-2 lg:py-1 lg:text-[10px]">
                          -{discount}%
                        </span>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
                      <h3 className="mb-0.5 truncate text-sm leading-tight font-bold text-gray-900 lg:mb-1 lg:text-base">
                        {food.name}
                      </h3>
                      <p className="truncate text-[10px] text-gray-500 lg:text-xs">
                        {food.restaurant}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2 lg:mt-2 lg:gap-3">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 lg:text-xs">
                          <Star
                            size={10}
                            fill="currentColor"
                            className="lg:h-3 lg:w-3"
                          />
                          {formatRatingValue(food.rating, food.reviews)}
                        </span>
                        <span
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium lg:text-xs ${
                            hasDistance
                              ? "bg-emerald-50 text-emerald-600"
                              : hasFoodPickupCoordinates(food)
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <MapPin size={10} className="lg:h-3 lg:w-3" />
                          {food.distance}
                        </span>
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="mb-0 text-[10px] text-gray-400 line-through lg:mb-0.5 lg:text-[11px]">
                            {formatRp(food.originalPrice)}
                          </p>
                          <p className="text-sm leading-none font-extrabold text-gray-900">
                            {formatRp(food.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void addToCart(food);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 lg:h-8 lg:w-8"
                          aria-label={`Tambah ${food.name} ke keranjang`}
                        >
                          <Plus size={16} className="lg:h-[18px] lg:w-[18px]" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!isLoadingFoods && foods.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                  <h3 className="text-base font-extrabold text-gray-950">
                    Belum ada menu aktif
                  </h3>
                  <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                    Menu akan tampil otomatis setelah owner menambahkan produk
                    aktif saat tersedia.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 z-50 flex w-full items-center justify-around border-t border-gray-200 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/home";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex w-16 flex-col items-center gap-1 p-2 transition-colors ${
                isActive
                  ? "text-emerald-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon
                size={22}
                fill={isActive ? "currentColor" : "none"}
                className={isActive ? "text-emerald-600" : undefined}
              />
              {item.href === "/cart" && cartCount > 0 ? (
                <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
              ) : null}
              <span
                className={`text-[10px] ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
