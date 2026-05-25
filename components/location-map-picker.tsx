"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { MapPinned, Navigation, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Coordinates } from "@/lib/geo-distance";

const defaultMapCenter: Coordinates = {
  latitude: -6.175392,
  longitude: 106.827153,
};

type LocationMapPickerProps = {
  coordinates: Coordinates | null;
  onCoordinatesChange: (coordinates: Coordinates) => void;
  buttonLabel?: string;
  title?: string;
  description?: string;
  buttonClassName?: string;
};

function formatCoordinates(coordinates: Coordinates) {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

export function LocationMapPicker({
  coordinates,
  onCoordinatesChange,
  buttonLabel = "Pilih di Peta",
  title = "Pilih Titik Lokasi",
  description = "Klik peta atau geser pin sampai tepat di lokasi yang dipakai.",
  buttonClassName = "inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50",
}: Readonly<LocationMapPickerProps>) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftCoordinates, setDraftCoordinates] =
    useState<Coordinates | null>(coordinates);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !mapElementRef.current) {
      return;
    }

    let disposed = false;
    let map: LeafletMap | null = null;
    let marker: LeafletMarker | null = null;

    const setMarker = (nextCoordinates: Coordinates) => {
      if (!map) {
        return;
      }

      setDraftCoordinates(nextCoordinates);
      setMapNotice(null);

      if (marker) {
        marker.setLatLng([nextCoordinates.latitude, nextCoordinates.longitude]);
        return;
      }

      void import("leaflet").then((leaflet) => {
        if (!map || disposed) {
          return;
        }

        marker = leaflet
          .marker([nextCoordinates.latitude, nextCoordinates.longitude], {
            draggable: true,
            icon: leaflet.divIcon({
              className: "resq-map-pin-icon",
              html: '<span class="resq-map-pin-core"></span>',
              iconAnchor: [18, 39],
              iconSize: [36, 42],
            }),
          })
          .addTo(map);

        marker.on("dragend", () => {
          const pin = marker?.getLatLng();

          if (pin) {
            setDraftCoordinates({
              latitude: pin.lat,
              longitude: pin.lng,
            });
          }
        });
      });
    };

    void import("leaflet")
      .then((leaflet) => {
        if (disposed || !mapElementRef.current) {
          return;
        }

        const initialCenter = coordinates ?? defaultMapCenter;

        map = leaflet
          .map(mapElementRef.current, {
            zoomControl: true,
          })
          .setView(
            [initialCenter.latitude, initialCenter.longitude],
            coordinates ? 18 : 13,
          );

        leaflet
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          })
          .addTo(map);

        map.on("click", (event) => {
          setMarker({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });

        if (coordinates) {
          setMarker(coordinates);
        }

        requestAnimationFrame(() => {
          map?.invalidateSize();
        });
      })
      .catch(() => {
        setMapNotice("Peta gagal dimuat. Coba buka ulang picker lokasi.");
      });

    return () => {
      disposed = true;
      marker?.remove();
      map?.remove();
    };
  }, [coordinates, isOpen]);

  const handleOpen = () => {
    setDraftCoordinates(coordinates);
    setMapNotice(null);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (!draftCoordinates) {
      setMapNotice("Klik titik lokasi di peta dulu.");
      return;
    }

    onCoordinatesChange(draftCoordinates);
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" onClick={handleOpen} className={buttonClassName}>
        <MapPinned size={15} />
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-map-picker-title"
          className="fixed inset-0 z-[120] flex items-end justify-center bg-gray-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="sheet-in flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:max-h-[min(48rem,calc(100dvh-2.5rem))]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-5">
              <div>
                <h2
                  id="location-map-picker-title"
                  className="text-base font-extrabold text-gray-950"
                >
                  {title}
                </h2>
                <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                aria-label="Tutup peta"
              >
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 p-3 sm:p-4">
              <div
                ref={mapElementRef}
                className="h-[min(58dvh,31rem)] min-h-72 w-full overflow-hidden rounded-[24px] border border-gray-100 bg-emerald-50"
              />
            </div>

            <footer className="border-t border-gray-100 bg-white px-4 py-4 sm:px-5">
              <div className="mb-3 flex min-h-11 items-center gap-3 rounded-2xl bg-gray-50 px-3 py-2">
                <Navigation size={16} className="shrink-0 text-emerald-600" />
                <p className="min-w-0 text-xs leading-5 font-bold text-gray-600">
                  {draftCoordinates
                    ? `Pin dipilih: ${formatCoordinates(draftCoordinates)}`
                    : "Klik peta untuk menaruh pin lokasi."}
                </p>
              </div>
              {mapNotice ? (
                <p className="mb-3 text-xs leading-5 font-bold text-red-600">
                  {mapNotice}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
                >
                  Gunakan Pin
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
