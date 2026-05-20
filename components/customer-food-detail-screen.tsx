"use client";

import Image from "next/image";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ChevronRight,
  ExternalLink,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import type { Food } from "@/lib/customer-data";
import { formatRp } from "@/lib/customer-data";
import {
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
} from "@/lib/customer-location";
import {
  applyFoodDistance,
  getPickupRouteUrl,
  type Coordinates,
} from "@/lib/geo-distance";

interface CustomerFoodDetailScreenProps {
  food: Food;
}

const pickupNotes = [
  "Tunjukkan QR pickup ke kasir.",
  "Ambil sesuai jam yang tersedia.",
  "Produk surplus layak konsumsi dan stok terbatas.",
] as const;

export function CustomerFoodDetailScreen({
  food,
}: CustomerFoodDetailScreenProps) {
  const router = useRouter();
  const { addToCart } = useCustomerApp();
  const [displayFood, setDisplayFood] = useState(food);
  const [customerCoordinates, setCustomerCoordinates] =
    useState<Coordinates | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [qty, setQty] = useState(1);

  const subtotal = displayFood.price * qty;
  const originalSubtotal = displayFood.originalPrice * qty;
  const savedAmount = originalSubtotal - subtotal;
  const pickupRoute =
    displayFood.restaurantLatitude !== null &&
    displayFood.restaurantLatitude !== undefined &&
    displayFood.restaurantLongitude !== null &&
    displayFood.restaurantLongitude !== undefined
      ? getPickupRouteUrl(
          customerCoordinates,
          {
            latitude: displayFood.restaurantLatitude,
            longitude: displayFood.restaurantLongitude,
          },
          `${displayFood.restaurant} ${displayFood.restaurantCity ?? ""}`,
        )
      : null;
  const pickupDistanceText =
    displayFood.distanceKm !== null && displayFood.distanceKm !== undefined
      ? displayFood.restaurantCity
        ? `${displayFood.restaurantCity} - estimasi ${displayFood.distance} dari lokasimu.`
        : `Estimasi ${displayFood.distance} dari lokasimu.`
      : displayFood.restaurantCity
        ? `${displayFood.restaurantCity} - atur titik maps untuk estimasi jarak.`
        : "Atur titik maps untuk estimasi jarak.";
  const savedPercent = useMemo(
    () => Math.round((savedAmount / originalSubtotal) * 100),
    [originalSubtotal, savedAmount],
  );

  useEffect(() => {
    let ignore = false;

    async function loadDistance() {
      try {
        const [response, favoriteResponse] = await Promise.all([
          fetch("/api/addresses", { cache: "no-store" }),
          fetch(`/api/favorites?menuItemId=${food.id}`, { cache: "no-store" }),
        ]);
        const data = (await response.json()) as {
          ok: boolean;
          addresses?: ApiCustomerAddress[];
        };
        const favoriteData = (await favoriteResponse.json()) as {
          ok: boolean;
          isFavorite?: boolean;
        };

        if (!ignore && data.ok) {
          const location = getCustomerLocationFromAddresses(data.addresses ?? []);
          setCustomerCoordinates(location.coordinates);
          setDisplayFood(applyFoodDistance(food, location.coordinates));
        }

        if (!ignore && favoriteData.ok) {
          setIsFavorite(Boolean(favoriteData.isFavorite));
        }
      } catch {
        if (!ignore) {
          setCustomerCoordinates(null);
          setDisplayFood(applyFoodDistance(food, null));
        }
      }
    }

    void loadDistance();

    return () => {
      ignore = true;
    };
  }, [food]);

  useEffect(() => {
    if (!isAdded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsAdded(false);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAdded]);

  const handleAddToCart = async () => {
    const isSaved = await addToCart(displayFood, qty);

    if (isSaved) {
      setIsAdded(true);
    }

    return isSaved;
  };

  const handleToggleFavorite = async () => {
    if (isTogglingFavorite) {
      return;
    }

    const nextFavoriteState = !isFavorite;
    setIsTogglingFavorite(true);
    setIsFavorite(nextFavoriteState);

    try {
      const response = await fetch(
        nextFavoriteState
          ? "/api/favorites"
          : `/api/favorites?menuItemId=${displayFood.id}`,
        {
          method: nextFavoriteState ? "POST" : "DELETE",
          headers: nextFavoriteState
            ? { "Content-Type": "application/json" }
            : undefined,
          body: nextFavoriteState
            ? JSON.stringify({ menuItemId: displayFood.id })
            : undefined,
        },
      );
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Favorit gagal diperbarui.");
      }
    } catch {
      setIsFavorite(!nextFavoriteState);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const storeRoute =
    displayFood.restaurantSlug || displayFood.restaurantId
      ? `/stores/${displayFood.restaurantSlug ?? displayFood.restaurantId}`
      : null;

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
        <div className="min-h-0 flex-1 overflow-y-auto pb-56 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="relative h-76 w-full shrink-0 md:h-[420px]">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="absolute top-10 left-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md transition-colors hover:bg-white"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className="absolute top-10 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md transition-colors hover:bg-white"
              aria-label="Simpan makanan"
            >
              <Heart
                size={20}
                className={
                  isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"
                }
              />
            </button>

            <Image
              src={displayFood.image}
              alt={displayFood.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

            <div className="absolute right-6 bottom-10 left-6 text-white md:right-10 md:left-10 lg:right-16 lg:left-16">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold">
                  Hemat {savedPercent}%
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-extrabold backdrop-blur">
                  {displayFood.category}
                </span>
              </div>
              <h1 className="max-w-4xl text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">
                {displayFood.name}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/90">
                <Store size={15} />
                {displayFood.restaurant}
              </p>
            </div>
          </section>

          <section className="relative z-20 -mt-8 min-h-full rounded-t-[40px] bg-white px-6 pt-7 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:mx-auto md:max-w-5xl md:rounded-[36px] md:px-8">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" />

            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-3 text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-amber-600">
                  <Star size={15} className="fill-amber-500 text-amber-500" />
                  <span className="text-sm font-extrabold">{displayFood.rating}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-500">
                  {displayFood.reviews} ulasan
                </p>
              </div>
              <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-emerald-600">
                  <MapPin size={15} />
                  <span className="text-sm font-extrabold">{displayFood.distance}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-500">Jarak</p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-blue-50 p-3 text-center">
                <div className="mb-1 text-sm font-extrabold text-blue-600">
                  {displayFood.stock} Porsi
                </div>
                <p className="text-[10px] font-bold text-gray-500">Stok</p>
              </div>
            </div>

            <div className="mb-6 rounded-[28px] border border-gray-100 bg-gray-50 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-500 uppercase">
                    Surplus Price
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-600">
                    {formatRp(displayFood.price)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-400 line-through">
                    {formatRp(displayFood.originalPrice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400">Hemat</p>
                  <p className="text-sm font-extrabold text-gray-950">
                    {formatRp(displayFood.originalPrice - displayFood.price)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-[22px] bg-white p-3">
                <span className="text-sm font-extrabold text-gray-900">
                  Jumlah
                </span>
                <div className="flex items-center gap-3 rounded-full border border-gray-100 bg-gray-50 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setQty((current) => Math.max(1, current - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-sm font-extrabold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQty((current) => Math.min(displayFood.stock, current + 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                    aria-label="Tambah jumlah"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <section className="mb-6">
              <h2 className="mb-2 text-lg font-extrabold text-gray-950">
                Deskripsi Makanan
              </h2>
              <p className="text-sm leading-7 font-medium text-gray-600">
                {displayFood.description}
              </p>
            </section>

            {storeRoute ? (
              <section className="mb-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Store size={22} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-gray-950">
                        {displayFood.restaurant}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-gray-500">
                        {displayFood.reviews} ulasan • {displayFood.rating}/5
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(storeRoute)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-gray-900 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500"
                  >
                    Toko
                    <ChevronRight size={14} />
                  </button>
                </div>
              </section>
            ) : null}

            <section className="mb-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={19} className="text-amber-500" />
                <h2 className="text-sm font-extrabold text-gray-950">
                  Pickup Info
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3">
                  <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">
                      {displayFood.time}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                      Datang sesuai jam pickup agar kualitas makanan optimal.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-3">
                  <Navigation
                    size={16}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-blue-900">
                      {displayFood.restaurantAddress ||
                        "Alamat restoran mengikuti data toko."}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-blue-700">
                      {pickupDistanceText}
                    </p>
                    {pickupRoute ? (
                      <a
                        href={pickupRoute.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-extrabold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                      >
                        <MapPin size={13} />
                        {pickupRoute.label}
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Leaf size={20} className="text-emerald-600" />
                <h2 className="text-sm font-extrabold text-emerald-950">
                  Dampak Food Rescue
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[10px] font-bold text-gray-400">
                    Makanan
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-gray-950">
                    {(qty * 0.8).toFixed(1)} Kg
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[10px] font-bold text-gray-400">CO2e</p>
                  <p className="mt-1 text-sm font-extrabold text-gray-950">
                    {(qty * 1.7).toFixed(1)} Kg
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck size={19} className="text-emerald-500" />
                <h2 className="text-sm font-extrabold text-gray-950">
                  Ketentuan Pickup
                </h2>
              </div>
              <div className="space-y-3">
                {pickupNotes.map((note) => (
                  <div key={note} className="flex gap-3 text-xs font-medium text-gray-500">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span className="leading-5">{note}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Ulasan Singkat
                  </h2>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-600">
                  {displayFood.rating}/5
                </span>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-1 flex items-center gap-1 text-amber-500">
                  <Star size={14} className="fill-amber-500" />
                  <span className="text-xs font-extrabold">
                    {displayFood.rating}/5 dari {displayFood.reviews} ulasan
                  </span>
                </div>
                <p className="text-xs leading-5 font-medium text-gray-500">
                  Detail komentar akan muncul setelah customer menyelesaikan
                  order dan mengirim ulasan.
                </p>
              </div>
            </section>
          </section>
        </div>

        <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-[32px] border-t border-gray-50 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:right-8 lg:bottom-8 lg:left-auto lg:w-[420px] lg:rounded-[32px] lg:border lg:border-gray-100 lg:shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="mb-0.5 text-[11px] font-medium text-gray-400 line-through">
                {formatRp(originalSubtotal)}
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-emerald-600">
                {formatRp(subtotal)}
              </p>
            </div>
            <p className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-600">
              Hemat {formatRp(savedAmount)}
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={() => void handleAddToCart()}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition-all active:scale-[0.98] ${
                isAdded
                  ? "bg-emerald-100 text-emerald-600 shadow-none"
                  : "bg-gray-900 text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] hover:bg-emerald-500"
              }`}
            >
              {isAdded ? "Berhasil Ditambah" : "Tambah ke Cart"}
              <ShoppingBag size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                void handleAddToCart().then((isSaved) => {
                  if (isSaved) {
                    router.push("/cart");
                  }
                });
              }}
              className="min-h-14 rounded-2xl bg-emerald-500 px-5 text-sm font-extrabold whitespace-nowrap text-white shadow-[0_12px_26px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98]"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
