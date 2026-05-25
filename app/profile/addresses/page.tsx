"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import { useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import {
  getBestBrowserLocation,
  getLocationAccuracyNotice,
} from "@/lib/browser-location";
import {
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
} from "@/lib/customer-location";

type Notice = {
  tone: "error" | "success";
  text: string;
};

function getMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export default function CustomerAddressesPage() {
  const {
    customerLocation,
    isCustomerLocationLoading,
    refreshCustomerLocation,
    setCustomerLocation,
  } = useCustomerApp();
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const hasCoordinates = Boolean(customerLocation.coordinates);
  const isBusy = isLocating || isCustomerLocationLoading;

  const handleUseAutomaticLocation = async () => {
    if (!navigator.geolocation) {
      setNotice({
        tone: "error",
        text: "Browser belum mendukung akses lokasi.",
      });
      return;
    }

    setIsLocating(true);
    setNotice(null);

    try {
      const result = await getBestBrowserLocation();
      const response = await fetch("/api/addresses/active-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.coordinates),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        address?: ApiCustomerAddress;
      };

      if (!response.ok || !data.ok || !data.address) {
        throw new Error(data.message || "Lokasi otomatis gagal disimpan.");
      }

      setCustomerLocation(getCustomerLocationFromAddresses([data.address]));
      await refreshCustomerLocation();
      setNotice({
        tone: "success",
        text: getLocationAccuracyNotice(result.accuracy),
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Lokasi otomatis gagal diambil. Pastikan GPS perangkat aktif.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-4 shadow-sm sm:px-6 md:px-8">
          <div className="mx-auto flex w-full max-w-3xl items-center">
            <Link
              href="/profile/settings"
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Kembali ke pengaturan akun"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </Link>
            <div className="ml-2 min-w-0">
              <h1 className="text-lg font-extrabold text-gray-900">
                Lokasi Aktif
              </h1>
              <p className="mt-0.5 text-xs font-medium text-gray-500">
                Dipakai untuk jarak dan rute pickup
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-28 [scrollbar-width:none] sm:px-6 md:px-8 [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-3xl">
            {notice ? (
              <section
                className={`mb-4 rounded-[24px] border p-4 text-sm font-bold ${
                  notice.tone === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </section>
            ) : null}

            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] ${
                    hasCoordinates
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isLocating ? (
                    <Navigation size={26} className="animate-pulse" />
                  ) : (
                    <MapPin size={28} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                    Customer
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                    {isCustomerLocationLoading
                      ? "Memuat lokasi"
                      : hasCoordinates
                        ? customerLocation.label
                        : "Lokasi belum aktif"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                    {hasCoordinates
                      ? "Lokasi otomatis sudah menjadi patokan pickup."
                      : "Aktifkan lokasi otomatis agar menu terdekat dan rute pickup dihitung dari posisimu."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleUseAutomaticLocation()}
                disabled={isBusy}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:cursor-wait disabled:bg-gray-300"
              >
                <Navigation size={18} />
                {isLocating
                  ? "Mencari Lokasi..."
                  : hasCoordinates
                    ? "Perbarui Lokasi Otomatis"
                    : "Aktifkan Lokasi Otomatis"}
              </button>

              {customerLocation.coordinates ? (
                <a
                  href={getMapsUrl(
                    customerLocation.coordinates.latitude,
                    customerLocation.coordinates.longitude,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3.5 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <CheckCircle2 size={17} />
                  Buka Lokasi Aktif
                  <ExternalLink size={15} />
                </a>
              ) : null}
            </section>
          </div>
        </main>
      </div>
    </MobileDeviceFrame>
  );
}
