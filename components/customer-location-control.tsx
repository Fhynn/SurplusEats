"use client";

import { ChevronDown, Loader2, MapPin } from "lucide-react";
import { useState } from "react";

import {
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
  type CustomerLocation,
} from "@/lib/customer-location";

type CustomerLocationControlProps = {
  location: CustomerLocation;
  onLocationChange: (location: CustomerLocation) => void;
};

export function CustomerLocationControl({
  location,
  onLocationChange,
}: Readonly<CustomerLocationControlProps>) {
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const locationStatus = isLocating
    ? "Mengambil Lokasi"
    : location.coordinates
      ? "Lokasi Aktif"
      : "Aktifkan Lokasi";

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Browser belum mendukung lokasi.");
      return;
    }

    setIsLocating(true);
    setNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/addresses/active-location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = (await response.json()) as {
            ok: boolean;
            message?: string;
            address?: ApiCustomerAddress;
          };

          if (!response.ok || !data.ok || !data.address) {
            throw new Error(data.message || "Lokasi gagal disimpan.");
          }

          onLocationChange(getCustomerLocationFromAddresses([data.address]));
          setNotice(null);
        } catch (error) {
          setNotice(
            error instanceof Error ? error.message : "Lokasi gagal disimpan.",
          );
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setNotice("Izinkan akses lokasi browser.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  };

  return (
    <div className="max-w-[230px]">
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={isLocating}
        className="flex max-w-full flex-col text-left disabled:cursor-wait"
      >
        <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-gray-400">
          {locationStatus}
          {isLocating ? (
            <Loader2 size={13} className="animate-spin text-emerald-500" />
          ) : (
            <ChevronDown size={14} className="text-emerald-500" />
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gray-900">
          <MapPin size={16} className="shrink-0 text-emerald-500" />
          <span className="truncate">
            {location.coordinates ? location.label : "Ambil lokasi sekarang"}
          </span>
        </span>
      </button>
      {notice ? (
        <p className="mt-1 truncate text-[10px] font-bold text-red-500">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
