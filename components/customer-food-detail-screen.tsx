"use client";

import Image from "next/image";
import { ChevronLeft, Clock, Leaf, MapPin, ShoppingBag, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import type { Food } from "@/lib/customer-data";
import { formatRp } from "@/lib/customer-data";

interface CustomerFoodDetailScreenProps {
  food: Food;
}

export function CustomerFoodDetailScreen({
  food,
}: CustomerFoodDetailScreenProps) {
  const router = useRouter();
  const { addToCart } = useCustomerApp();
  const [isAdded, setIsAdded] = useState(false);

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

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative h-72 w-full shrink-0">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="absolute top-10 left-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md transition-colors hover:bg-white"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </button>

            <Image
              src={food.image}
              alt={food.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <div className="relative z-20 -mt-10 min-h-full rounded-t-[40px] bg-white px-6 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-2 flex items-start justify-between gap-4">
              <h1 className="w-2/3 text-2xl leading-tight font-extrabold text-gray-900">
                {food.name}
              </h1>
              <div className="flex shrink-0 items-center rounded-xl border border-amber-200/50 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-[0_4px_12px_rgba(251,191,36,0.12)]">
                <Clock size={12} className="mr-1" />
                {food.time}
              </div>
            </div>

            <p className="mb-5 text-sm font-medium text-gray-500">
              {food.restaurant}
            </p>

            <div className="mb-6 flex items-center justify-between border-y border-gray-100 px-2 py-4">
              <div className="flex flex-col items-center">
                <div className="mb-1 flex items-center gap-1">
                  <Star size={16} className="fill-amber-500 text-amber-500" />
                  <span className="font-extrabold text-gray-900">
                    {food.rating}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  {food.reviews} ulasan
                </span>
              </div>

              <div className="h-8 w-px bg-gray-200" />

              <div className="flex flex-col items-center">
                <div className="mb-1 flex items-center gap-1 text-emerald-600">
                  <MapPin size={16} />
                  <span className="font-extrabold">{food.distance}</span>
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  Jarak
                </span>
              </div>

              <div className="h-8 w-px bg-gray-200" />

              <div className="flex flex-col items-center">
                <div className="mb-1 font-extrabold text-amber-600">
                  {food.stock} Porsi
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  Sisa Stok
                </span>
              </div>
            </div>

            <h2 className="mb-2 font-bold text-gray-900">Deskripsi Makanan</h2>
            <p className="mb-8 text-sm leading-relaxed text-gray-600">
              {food.description}
            </p>

            <div className="flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4 shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
              <Leaf size={24} className="mt-0.5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed font-medium text-emerald-800">
                Membeli makanan ini berarti kamu telah berkontribusi langsung
                mengurangi jejak karbon dan limbah makanan di lingkungan
                sekitarmu.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 z-50 flex items-center justify-between rounded-t-[32px] border-t border-gray-50 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <div>
            <p className="mb-0.5 text-[11px] font-medium text-gray-400 line-through">
              {formatRp(food.originalPrice)}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-emerald-600">
              {formatRp(food.price)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              addToCart(food);
              setIsAdded(true);
            }}
            className={`flex items-center gap-2 rounded-2xl px-8 py-4 font-bold transition-all active:scale-95 ${
              isAdded
                ? "bg-emerald-100 text-emerald-600 shadow-none"
                : "bg-gray-900 text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] hover:bg-emerald-500"
            }`}
          >
            {isAdded ? "Berhasil Ditambah!" : "Tambah ke Cart"}
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
