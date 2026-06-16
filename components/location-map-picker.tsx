"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Clock3, Loader2, MapPinned, Navigation, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Coordinates } from "@/lib/geo-distance";
import { getStorePickupCoordinateIssue } from "@/lib/location-quality";
import {
  readRecentLocations,
  saveRecentLocation,
  type RecentLocation,
  type RecentLocationSource,
} from "@/lib/recent-locations";
import {
  formatCoordinateLabel,
  reverseGeocodeCoordinates,
  type ReverseGeocodeResult,
} from "@/lib/reverse-geocode";

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
  recentSource?: RecentLocationSource;
};

type MapNotice = {
  tone: "error" | "success";
  text: string;
};

type SearchResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
};

type SearchLocationResponse = {
  ok: boolean;
  message?: string;
  results?: SearchResult[];
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
  recentSource,
}: Readonly<LocationMapPickerProps>) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const leafletMarkerRef = useRef<LeafletMarker | null>(null);
  const reverseLookupIdRef = useRef(0);
  const setMarkerRef = useRef<
    ((
      coordinates: Coordinates,
      notice?: MapNotice | null,
      fallbackAddress?: ReverseGeocodeResult | null,
    ) => void) | null
  >(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftCoordinates, setDraftCoordinates] =
    useState<Coordinates | null>(coordinates);
  const [mapNotice, setMapNotice] = useState<MapNotice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [draftAddress, setDraftAddress] = useState<ReverseGeocodeResult | null>(
    null,
  );
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);

  const resolveDraftAddress = useCallback(
    async (
      nextCoordinates: Coordinates,
      fallbackAddress: ReverseGeocodeResult | null = null,
    ) => {
      const requestId = reverseLookupIdRef.current + 1;
      reverseLookupIdRef.current = requestId;

      if (fallbackAddress) {
        setDraftAddress(fallbackAddress);
      } else {
        setIsResolvingAddress(true);
      }

      const resolvedAddress = await reverseGeocodeCoordinates(nextCoordinates);

      if (reverseLookupIdRef.current !== requestId) {
        return;
      }

      setDraftAddress(resolvedAddress ?? fallbackAddress);
      setIsResolvingAddress(false);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !mapElementRef.current) {
      return;
    }

    let disposed = false;
    let map: LeafletMap | null = null;

    const setMarker = (
      nextCoordinates: Coordinates,
      notice: MapNotice | null = null,
      fallbackAddress: ReverseGeocodeResult | null = null,
    ) => {
      if (!leafletMapRef.current) {
        return;
      }

      setDraftCoordinates(nextCoordinates);
      setMapNotice(notice);
      void resolveDraftAddress(nextCoordinates, fallbackAddress);

      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([
          nextCoordinates.latitude,
          nextCoordinates.longitude,
        ]);
        return;
      }

      void import("leaflet").then((leaflet) => {
        if (!leafletMapRef.current || disposed) {
          return;
        }

        leafletMarkerRef.current = leaflet
          .marker([nextCoordinates.latitude, nextCoordinates.longitude], {
            draggable: true,
            icon: leaflet.divIcon({
              className: "resq-map-pin-icon",
              html: '<span class="resq-map-pin-core"></span>',
              iconAnchor: [18, 39],
              iconSize: [36, 42],
            }),
          })
          .addTo(leafletMapRef.current);

        leafletMarkerRef.current.on("dragend", () => {
          const pin = leafletMarkerRef.current?.getLatLng();

          if (pin) {
            setDraftCoordinates({
              latitude: pin.lat,
              longitude: pin.lng,
            });
            void resolveDraftAddress({
              latitude: pin.lat,
              longitude: pin.lng,
            });
            setMapNotice({
              tone: "success",
              text: "Pin diperbarui. Pastikan titiknya sudah tepat.",
            });
          }
        });
      });
    };
    setMarkerRef.current = setMarker;

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
        leafletMapRef.current = map;

        leaflet
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          })
          .addTo(map);

        map.on("click", (event) => {
          setMarker(
            {
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            },
            {
              tone: "success",
              text: "Lokasi dipilih dari peta. Kamu bisa geser pin jika perlu.",
            },
          );
        });

        if (coordinates) {
          setMarker(coordinates);
        }

        requestAnimationFrame(() => {
          map?.invalidateSize();
        });
      })
      .catch(() => {
        setMapNotice({
          tone: "error",
          text: "Peta gagal dimuat. Coba buka ulang picker lokasi.",
        });
      });

    return () => {
      disposed = true;
      setMarkerRef.current = null;
      leafletMarkerRef.current?.remove();
      leafletMarkerRef.current = null;
      map?.remove();
      leafletMapRef.current = null;
    };
  }, [coordinates, isOpen, resolveDraftAddress]);

  const handleOpen = () => {
    setDraftCoordinates(coordinates);
    setDraftAddress(null);
    setMapNotice(null);
    setSearchQuery("");
    setSearchResults([]);
    setRecentLocations(recentSource ? readRecentLocations(recentSource) : []);
    setIsOpen(true);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();

    if (query.length < 3) {
      setSearchResults([]);
      setMapNotice({
        tone: "error",
        text: "Ketik minimal 3 huruf nama toko, jalan, atau area.",
      });
      return;
    }

    setIsSearching(true);
    setMapNotice(null);
    setSearchResults([]);

    try {
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as SearchLocationResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Pencarian lokasi gagal. Coba kata kunci lain.",
        );
      }

      const results = (data.results ?? []).filter(
        (result) =>
          Number.isFinite(Number(result.lat)) &&
          Number.isFinite(Number(result.lon)),
      );

      setSearchResults(results);

      if (results.length === 0) {
        setMapNotice({
          tone: "error",
          text: "Lokasi tidak ditemukan. Coba nama jalan, toko, atau kecamatan.",
        });
      } else {
        setMapNotice({
          tone: "success",
          text: "Pilih salah satu hasil pencarian, lalu pastikan pin tepat di lokasi pickup.",
        });
      }
    } catch (error) {
      setSearchResults([]);
      setMapNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Pencarian lokasi gagal. Coba lagi.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const nextCoordinates = {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    };
    const fallbackAddress = {
      label: result.display_name,
      addressLine: result.display_name,
    };

    setSearchQuery(result.display_name);
    setSearchResults([]);
    leafletMapRef.current?.setView(
      [nextCoordinates.latitude, nextCoordinates.longitude],
      18,
    );
    if (leafletMapRef.current && setMarkerRef.current) {
      setMarkerRef.current(
        nextCoordinates,
        {
          tone: "success",
          text: "Lokasi ditemukan dari pencarian. Geser pin kalau titiknya belum tepat.",
        },
        fallbackAddress,
      );
      return;
    }

    setDraftCoordinates(nextCoordinates);
    void resolveDraftAddress(nextCoordinates, fallbackAddress);
    setMapNotice({
      tone: "success",
      text: "Lokasi ditemukan dari pencarian. Geser pin kalau titiknya belum tepat.",
    });
  };

  const handleSelectRecentLocation = (recentLocation: RecentLocation) => {
    const fallbackAddress = {
      label: recentLocation.label,
      addressLine: recentLocation.addressLine || recentLocation.label,
    };

    setSearchQuery(recentLocation.label);
    setSearchResults([]);
    leafletMapRef.current?.setView(
      [
        recentLocation.coordinates.latitude,
        recentLocation.coordinates.longitude,
      ],
      18,
    );

    if (leafletMapRef.current && setMarkerRef.current) {
      setMarkerRef.current(
        recentLocation.coordinates,
        {
          tone: "success",
          text: "Lokasi terakhir dipakai. Geser pin kalau titiknya perlu disesuaikan.",
        },
        fallbackAddress,
      );
      return;
    }

    setDraftCoordinates(recentLocation.coordinates);
    void resolveDraftAddress(recentLocation.coordinates, fallbackAddress);
  };

  const handleConfirm = () => {
    if (!draftCoordinates) {
      setMapNotice({
        tone: "error",
        text: "Klik titik lokasi di peta dulu.",
      });
      return;
    }

    const coordinateIssue = getStorePickupCoordinateIssue(draftCoordinates);

    if (coordinateIssue) {
      setMapNotice({
        tone: "error",
        text: coordinateIssue,
      });
      return;
    }

    if (recentSource) {
      const savedLocation = saveRecentLocation({
        source: recentSource,
        label: draftAddress?.label || formatCoordinateLabel(draftCoordinates),
        addressLine: draftAddress?.addressLine,
        coordinates: draftCoordinates,
      });

      setRecentLocations(readRecentLocations(savedLocation.source));
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
              <form
                className="mb-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSearch();
                }}
              >
                <div className="relative flex gap-2">
                  <Search
                    size={16}
                    className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchResults([]);
                      if (mapNotice?.tone === "error") {
                        setMapNotice(null);
                      }
                    }}
                    placeholder="Cari nama toko, jalan, atau area"
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white pr-3 pl-10 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-300"
                  >
                    {isSearching ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                    Cari
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1 shadow-sm [scrollbar-width:thin]">
                    {searchResults.map((result) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-xs leading-5 font-bold text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </form>

              {recentLocations.length > 0 ? (
                <div className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-2">
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">
                    <Clock3 size={12} />
                    Lokasi Terakhir
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {recentLocations.map((recentLocation) => (
                      <button
                        key={recentLocation.id}
                        type="button"
                        onClick={() => handleSelectRecentLocation(recentLocation)}
                        className="min-w-48 rounded-2xl bg-white px-3 py-2 text-left text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        <span className="block truncate">
                          {recentLocation.label}
                        </span>
                        {recentLocation.addressLine ? (
                          <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 font-semibold text-gray-400">
                            {recentLocation.addressLine}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                ref={mapElementRef}
                className="h-[min(58dvh,31rem)] min-h-72 w-full overflow-hidden rounded-[24px] border border-gray-100 bg-emerald-50"
              />
            </div>

            <footer className="border-t border-gray-100 bg-white px-4 py-4 sm:px-5">
              <div
                className={`mb-3 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 ${
                  draftCoordinates
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <Navigation size={16} className="shrink-0 text-emerald-600" />
                <div className="min-w-0 text-xs leading-5 font-bold text-gray-600">
                  {draftCoordinates ? (
                    <>
                      <p className="truncate">
                        {isResolvingAddress && !draftAddress
                          ? "Mencari nama lokasi..."
                          : draftAddress?.label || "Lokasi ditemukan"}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400">
                        {formatCoordinates(draftCoordinates)}
                      </p>
                    </>
                  ) : (
                    <p>Klik peta untuk menaruh pin lokasi.</p>
                  )}
                </div>
              </div>
              {mapNotice ? (
                <p
                  className={`mb-3 text-xs leading-5 font-bold ${
                    mapNotice.tone === "success"
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {mapNotice.text}
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
