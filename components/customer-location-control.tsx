"use client";

import { Clock3, Loader2, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import {
  getBestBrowserLocation,
  getLocationAccuracyNotice,
} from "@/lib/browser-location";
import type { Coordinates } from "@/lib/geo-distance";
import {
  readRecentLocations,
  saveRecentLocation,
  type RecentLocation,
} from "@/lib/recent-locations";
import { reverseGeocodeCoordinates } from "@/lib/reverse-geocode";
import {
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
  type CustomerLocation,
} from "@/lib/customer-location";

type CustomerLocationControlProps = {
  location: CustomerLocation;
  isLoading?: boolean;
  onLocationChange: (location: CustomerLocation) => void;
};

export function CustomerLocationControl({
  location,
  isLoading = false,
  onLocationChange,
}: Readonly<CustomerLocationControlProps>) {
  const { refreshCustomerLocation } = useCustomerApp();
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const isBusy = isLocating || isLoading;
  const locationStatus = isLocating
    ? "Mencari Lokasi"
    : isLoading
      ? "Memuat Lokasi"
      : "Lokasi Otomatis";

  useEffect(() => {
    setRecentLocations(readRecentLocations("customer"));
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 5000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const persistActiveLocation = async ({
    coordinates,
    accuracy,
    label,
    addressLine,
  }: {
    coordinates: Coordinates;
    accuracy?: number | null;
    label?: string;
    addressLine?: string;
  }) => {
    const response = await fetch("/api/addresses/active-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...coordinates,
        accuracy,
        label,
        addressLine,
      }),
    });
    const data = (await response.json()) as {
      ok: boolean;
      message?: string;
      address?: ApiCustomerAddress;
    };

    if (!response.ok || !data.ok || !data.address) {
      throw new Error(data.message || "Lokasi otomatis gagal disimpan.");
    }

    const nextLocation = getCustomerLocationFromAddresses([data.address]);

    onLocationChange(nextLocation);
    saveRecentLocation({
      source: "customer",
      label: data.address.label,
      addressLine: data.address.addressLine,
      coordinates,
    });
    setRecentLocations(readRecentLocations("customer"));
    await refreshCustomerLocation();

    return nextLocation;
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setNotice({
        tone: "error",
        text: "Browser belum mendukung lokasi.",
      });
      return;
    }

    setIsLocating(true);
    setNotice(null);

    try {
      const result = await getBestBrowserLocation();
      const geocodedLocation = await reverseGeocodeCoordinates(result.coordinates);
      const nextLocation = await persistActiveLocation({
        coordinates: result.coordinates,
        accuracy: result.accuracy,
        label: geocodedLocation?.label,
        addressLine: geocodedLocation?.addressLine,
      });
      setNotice({
        tone: "success",
        text: `${getLocationAccuracyNotice(result.accuracy)} ${nextLocation.label}`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Lokasi otomatis gagal diambil. Pastikan lokasi perangkat aktif.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleUseRecentLocation = async (recentLocation: RecentLocation) => {
    if (isBusy) {
      return;
    }

    setIsLocating(true);
    setNotice(null);

    try {
      await persistActiveLocation({
        coordinates: recentLocation.coordinates,
        label: recentLocation.label,
        addressLine: recentLocation.addressLine,
      });
      setIsRecentOpen(false);
      setNotice({
        tone: "success",
        text: `Lokasi terakhir diaktifkan: ${recentLocation.label}`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Lokasi terakhir gagal diaktifkan.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="relative w-[min(250px,calc(100vw-9rem))]">
      <div className="flex h-11 items-stretch gap-2">
        <button
          type="button"
          onClick={() => void handleUseCurrentLocation()}
          disabled={isBusy}
          className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-100 disabled:cursor-wait"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
            {isBusy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Navigation size={16} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] leading-4 font-bold text-emerald-700">
              {locationStatus}
            </span>
            <span className="block truncate text-xs leading-4 font-extrabold text-gray-900">
              {isLoading && !location.coordinates
                ? "Membaca lokasi..."
                : location.coordinates
                  ? location.label
                  : "Aktifkan otomatis"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setIsRecentOpen((value) => !value);
          }}
          disabled={isBusy || recentLocations.length === 0}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            recentLocations.length === 0
              ? "invisible pointer-events-none border-transparent"
              : isRecentOpen
                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
          aria-label="Pilih lokasi terakhir"
          aria-expanded={isRecentOpen}
          aria-hidden={recentLocations.length === 0}
          tabIndex={recentLocations.length === 0 ? -1 : 0}
        >
          <Clock3 size={17} />
        </button>
      </div>

      {notice ? (
        <p
          role="status"
          className={`absolute top-[calc(100%+0.5rem)] left-0 z-[90] w-[min(20rem,calc(100vw-2rem))] rounded-xl border px-3 py-2 text-xs leading-5 font-bold shadow-lg ${
            notice.tone === "success"
              ? "border-emerald-100 bg-white text-emerald-700"
              : "border-red-100 bg-white text-red-600"
          }`}
        >
          <span className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span>{notice.text}</span>
          </span>
        </p>
      ) : null}
      {isRecentOpen ? (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-[90] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">
            Pilih Lokasi Terakhir
          </p>
          <div className="max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {recentLocations.map((recentLocation) => (
              <button
                key={recentLocation.id}
                type="button"
                onClick={() => void handleUseRecentLocation(recentLocation)}
                disabled={isBusy}
                className="flex w-full items-start gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-extrabold text-gray-900">
                    {recentLocation.label}
                  </span>
                  {recentLocation.addressLine ? (
                    <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 font-semibold text-gray-500">
                      {recentLocation.addressLine}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
