"use client";

import { Loader2, MapPin, Navigation } from "lucide-react";
import { useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import {
  getBestBrowserLocation,
  getLocationAccuracyNotice,
} from "@/lib/browser-location";
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
  const isBusy = isLocating || isLoading;
  const locationStatus = isLocating
    ? "Mencari Lokasi"
    : isLoading
      ? "Memuat Lokasi"
      : "Lokasi Otomatis";

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

      onLocationChange(getCustomerLocationFromAddresses([data.address]));
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
            : "Lokasi otomatis gagal diambil. Pastikan lokasi perangkat aktif.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="max-w-[230px]">
      <button
        type="button"
        onClick={() => void handleUseCurrentLocation()}
        disabled={isBusy}
        className="flex max-w-full flex-col text-left disabled:cursor-wait"
      >
        <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-gray-400">
          {locationStatus}
          {isBusy ? (
            <Loader2 size={13} className="animate-spin text-emerald-500" />
          ) : (
            <Navigation size={13} className="text-emerald-500" />
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gray-900">
          <MapPin size={16} className="shrink-0 text-emerald-500" />
          <span className="truncate">
            {isLoading && !location.coordinates
              ? "Membaca lokasi..."
              : location.coordinates
                ? location.label
                : "Aktifkan otomatis"}
          </span>
        </span>
      </button>
      {notice ? (
        <p
          className={`mt-1 text-[10px] leading-4 font-bold ${
            notice.tone === "success" ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
